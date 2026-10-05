"""ffmpeg / ffprobe helpers: probing, frame reading, encoding, audio decode."""
from __future__ import annotations

import functools
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

SAMPLE_RATE = 48000


def _bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(f"{name} not found on PATH (install ffmpeg 6+)")
    return path


def ffmpeg() -> str:
    return _bin("ffmpeg")


def ffprobe() -> str:
    return _bin("ffprobe")


def run(cmd: list, **kw) -> subprocess.CompletedProcess:
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def probe(path: Path) -> dict:
    """Return {width, height, fps, duration, frames, has_audio}."""
    out = subprocess.run(
        [ffprobe(), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        check=True, capture_output=True, text=True).stdout
    info = json.loads(out)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    num, den = (int(x) for x in v.get("avg_frame_rate", "60/1").split("/"))
    fps = num / den if den else 60.0
    duration = float(v.get("duration") or info["format"].get("duration") or 0)
    frames = int(v.get("nb_frames") or round(duration * fps))
    return {
        "width": int(v["width"]), "height": int(v["height"]), "fps": fps,
        "duration": duration, "frames": frames,
        "has_audio": any(s["codec_type"] == "audio" for s in info["streams"]),
    }


class VideoReader:
    """Sequential RGB frame reader with seek-by-restart."""

    def __init__(self, path: Path, width: int, height: int, fps: float):
        self.path, self.w, self.h, self.fps = Path(path), width, height, fps
        self.proc = None
        self.next_index = 0
        self.frame_bytes = width * height * 3

    def _open(self, index: int):
        self.close()
        cmd = [ffmpeg(), "-v", "error"]
        if index > 0:
            cmd += ["-ss", f"{index / self.fps:.6f}"]
        cmd += ["-i", str(self.path), "-map", "0:v:0", "-f", "rawvideo", "-pix_fmt", "rgb24",
                "-vsync", "passthrough", "-"]
        self.proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                     bufsize=self.frame_bytes * 4)
        self.next_index = index

    def read(self, index: int) -> np.ndarray | None:
        if self.proc is None or index < self.next_index or index > self.next_index + 90:
            self._open(index)
        while True:
            buf = self.proc.stdout.read(self.frame_bytes)
            if len(buf) < self.frame_bytes:
                return None
            i = self.next_index
            self.next_index += 1
            if i == index:
                return np.frombuffer(buf, np.uint8).reshape(self.h, self.w, 3)

    def close(self):
        if self.proc:
            self.proc.stdout.close()
            self.proc.kill()
            self.proc.wait()
            self.proc = None


def read_audio(path: Path, duration: float) -> np.ndarray:
    """Decode the audio track to float32 stereo (N, 2) at 48 kHz; silence if there is none."""
    n = int(round(duration * SAMPLE_RATE))
    try:
        raw = subprocess.run(
            [ffmpeg(), "-v", "error", "-i", str(path), "-map", "0:a:0", "-f", "f32le",
             "-ac", "2", "-ar", str(SAMPLE_RATE), "-"],
            check=True, capture_output=True).stdout
        a = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    except subprocess.CalledProcessError:
        a = np.zeros((0, 2), np.float32)
    if len(a) < n:
        a = np.concatenate([a, np.zeros((n - len(a), 2), np.float32)])
    return a


def write_wav(path: Path, audio: np.ndarray):
    import wave
    pcm = (np.clip(audio, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())


def loudnorm(src: Path, dst: Path, target_lufs: float = -14.0, true_peak: float = -1.0):
    """Two-pass EBU R128 normalisation of a wav file."""
    af = f"loudnorm=I={target_lufs}:TP={true_peak}:LRA=11"
    p = subprocess.run([ffmpeg(), "-hide_banner", "-i", str(src), "-af", af + ":print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True)
    text = p.stderr
    try:
        m = json.loads(text[text.rindex("{"):text.rindex("}") + 1])
        if float(m["input_i"]) < -70:  # silent: nothing to normalise
            raise ValueError
        af += (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
               f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    except (ValueError, KeyError):
        shutil.copyfile(src, dst)
        return
    run([ffmpeg(), "-v", "error", "-y", "-i", src, "-af", af, "-ar", SAMPLE_RATE, dst])


@functools.lru_cache(maxsize=None)
def video_encoder(prefer_gpu: bool = True) -> list:
    """Encoder args: h264_nvenc when it actually works, else libx264."""
    if prefer_gpu:
        test = subprocess.run(
            [ffmpeg(), "-v", "error", "-f", "lavfi", "-i", "color=s=256x256:d=0.1", "-c:v", "h264_nvenc",
             "-f", "null", "-"], capture_output=True)
        if test.returncode == 0:
            return ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "19", "-b:v", "0"]
    return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18"]


class VideoWriter:
    """Pipe RGB frames into ffmpeg, muxing a finished wav track."""

    def __init__(self, path: Path, width: int, height: int, fps: float, audio_wav: Path | None,
                 prefer_gpu: bool = True):
        cmd = [ffmpeg(), "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
               "-s", f"{width}x{height}", "-r", f"{fps:g}", "-i", "-"]
        if audio_wav:
            cmd += ["-i", str(audio_wav)]
        cmd += video_encoder(prefer_gpu) + ["-pix_fmt", "yuv420p", "-movflags", "+faststart"]
        if audio_wav:
            cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += [str(path)]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        self.size = (width, height)

    def write(self, frame: np.ndarray):
        assert frame.shape[1] == self.size[0] and frame.shape[0] == self.size[1], frame.shape
        self.proc.stdin.write(np.ascontiguousarray(frame, np.uint8).tobytes())

    def close(self):
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise RuntimeError("ffmpeg encode failed")
