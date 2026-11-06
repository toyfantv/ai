#!/usr/bin/env python3
"""Contact sheet of stills: python tools/sheet.py build/ep06 out.jpg t1 t2 ..."""
import subprocess, sys
d, out, ts = sys.argv[1], sys.argv[2], sys.argv[3:]
fs = [f"{d}/stills/t_{float(t):.2f}.jpg" for t in ts]
n = len(fs); cols = min(n, 6 if n > 8 else 4)
inputs = sum([['-i', f] for f in fs], [])
lay = '|'.join(f'{(i % cols) * 360}_{(i // cols) * 640}' for i in range(n))
filt = ''.join(f'[{i}:v]scale=360:640,drawtext=text={ts[i]}:x=6:y=6:fontsize=30:fontcolor=yellow:borderw=2[v{i}];' for i in range(n))
filt += ''.join(f'[v{i}]' for i in range(n)) + (f'xstack=inputs={n}:layout={lay}:fill=black' if n > 1 else 'null')
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', filt, out], check=True)
