-- DRAFT, UNTESTED (written without the CrashClient source at hand). Paste into
-- src/client/CrashClient.client.lua (or require as a ModuleScript) and wire as noted.
-- Logs camera cuts and samples every character's screen position for the take timeline.
--
-- Wiring:
--   * TimelineRec.start() where the client receives GO.
--   * TimelineRec.cut(cameraName, shotType, shows, framing) wherever the director switches shots
--     (next to the existing DirectorLog append). `shows` = subject ids, most important first.
--   * TimelineRec.stop() when the take ends; it writes the JSON (~100 KB for 15 s, too big for an
--     attribute) into a client-side StringValue LocalPlayer.CrashTimeline, which record.py reads over MCP:
--       python tools/studio_mcp.py lua Client -e "return game.Players.LocalPlayer.CrashTimeline.Value"
--   * characterModels(): return { [id] = Model } for the scene's characters (Characters folder).

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local TimelineRec = {}

local SAMPLE_HZ = 20
local goClock, conn, lastSample = nil, nil, 0
local data = nil

local function now() return os.clock() - goClock end
local function r3(x) return math.floor(x * 1000 + 0.5) / 1000 end

-- The recorded video is the centre 16:9 slice of the viewport (record.py crops the sides).
local function to169(px, py, vp)
	local w169 = math.min(vp.X, vp.Y * 16 / 9)
	local h169 = w169 * 9 / 16
	local x0 = (vp.X - w169) / 2
	local y0 = (vp.Y - h169) / 2
	return (px - x0) / w169, (py - y0) / h169
end

local function sample(models)
	local cam = workspace.CurrentCamera
	local vp = cam.ViewportSize
	local t = r3(now())
	for id, model in pairs(models) do
		local head = model:FindFirstChild("Head")
		if head then
			local hp, inFront = cam:WorldToViewportPoint(head.Position)
			local hx, hy = to169(hp.X, hp.Y, vp)
			local cf, size = model:GetBoundingBox()
			local x0, y0, x1, y1 = math.huge, math.huge, -math.huge, -math.huge
			for _, sx in ipairs({ -0.5, 0.5 }) do
				for _, sy in ipairs({ -0.5, 0.5 }) do
					for _, sz in ipairs({ -0.5, 0.5 }) do
						local p = cam:WorldToViewportPoint((cf * CFrame.new(size.X * sx, size.Y * sy, size.Z * sz)).Position)
						local nx, ny = to169(p.X, p.Y, vp)
						x0, y0 = math.min(x0, nx), math.min(y0, ny)
						x1, y1 = math.max(x1, nx), math.max(y1, ny)
					end
				end
			end
			local on = inFront and hx > -0.05 and hx < 1.05 and hy > -0.05 and hy < 1.05
			local list = data.tracks[id]
			if not list then list = {}; data.tracks[id] = list end
			table.insert(list, { t = t, head = { r3(hx), r3(hy) }, box = { r3(x0), r3(y0), r3(x1), r3(y1) }, onScreen = on })
		end
	end
end

function TimelineRec.start(characterModels)
	goClock = os.clock()
	data = { cuts = {}, tracks = {} }
	lastSample = -1
	conn = RunService.RenderStepped:Connect(function()
		local t = now()
		if t - lastSample >= 1 / SAMPLE_HZ then
			lastSample = t
			sample(characterModels())
		end
	end)
end

function TimelineRec.cut(cameraName, shotType, shows, framing)
	if not data then return end
	table.insert(data.cuts, { t = r3(now()), camera = cameraName, type = shotType, shows = shows or {}, framing = framing })
end

function TimelineRec.stop()
	if conn then conn:Disconnect(); conn = nil end
	if not data then return end
	local holder = Players.LocalPlayer:FindFirstChild("CrashTimeline") or Instance.new("StringValue")
	holder.Name = "CrashTimeline"
	holder.Value = HttpService:JSONEncode(data)
	holder.Parent = Players.LocalPlayer
end

return TimelineRec
