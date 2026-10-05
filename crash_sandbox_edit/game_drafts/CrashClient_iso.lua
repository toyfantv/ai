-- DRAFT, UNTESTED. ISO passes from the replay buffer (docs/ISO_PASSES.md).
-- Hook into CrashClient: extend the CrashReplay attribute handler (~2034, which today only takes a
-- number = replay speed) with the string form below. startReplay({from, to, once}) (~406) already
-- plays a window once on the runTime() clock; stopReplay() ends it. `replayPuppet(who)` is new: look
-- the character's puppet up in replay.puppets / replay.puppetOf. onDone needs a small hook in
-- updateReplay where `range.once` calls stopReplay().

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer

local function faceCamera(head)
	local cam = workspace.CurrentCamera
	local params = RaycastParams.new()
	params.FilterDescendantsInstances = { head.Parent }
	params.FilterType = Enum.RaycastFilterType.Exclude
	-- straight on first; if something (a windshield, a roof) blocks the view, swing around the head
	local pos
	for _, deg in ipairs({ 0, 30, -30, 60, -60 }) do
		local dir = (CFrame.Angles(0, math.rad(deg), 0):VectorToWorldSpace(head.CFrame.LookVector)).Unit
		pos = head.Position + dir * 2.2 + Vector3.yAxis * 0.15
		if not workspace:Raycast(head.Position, pos - head.Position, params) then
			break
		end
	end
	cam.FieldOfView = 40
	cam.CFrame = CFrame.lookAt(pos, head.Position)
end

-- CrashReplay = "iso:<who>:<from>:<to>:face"
player:GetAttributeChangedSignal("CrashReplay"):Connect(function()
	local spec = player:GetAttribute("CrashReplay")
	if type(spec) ~= "string" or spec:sub(1, 4) ~= "iso:" then return end
	local who, from, to = spec:match("^iso:([^:]+):([%d%.]+):([%d%.]+)")
	from, to = tonumber(from), tonumber(to)
	local conn
	replay.speed = 1
	startReplay({ from = from, to = to, once = true, onDone = function()
		if conn then conn:Disconnect() end
		player:SetAttribute("CrashReplayState", "done")
		player:SetAttribute("CrashReplay", "")
	end })
	local first = true
	conn = RunService.RenderStepped:Connect(function()
		local puppet = replayPuppet(who) -- the rigid copy of that character in the replay
		local head = puppet and puppet:FindFirstChild("Head")
		if head then
			workspace.CurrentCamera.CameraType = Enum.CameraType.Scriptable
			faceCamera(head)
			if first then
				first = false
				player:SetAttribute("CrashReplayState", "playing")
			end
		end
	end)
end)
