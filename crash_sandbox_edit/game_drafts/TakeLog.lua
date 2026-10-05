-- DRAFT, UNTESTED (written without Studio). src/server/modules/TakeLog.lua
-- Server-side event log for the take timeline (docs/TIMELINE_SPEC.md).
--
-- Wiring (local session):
--   * CrashServer: TakeLog.start(scene) when GO fires (same moment the countdown ends).
--   * ctx.beat(kind, info)       -> TakeLog.event(kind, info)
--   * Damage first/big impact    -> TakeLog.event("impact", {who = vehicleId, target = hitId, speed = relSpeed, pos = p})
--   * NPC:knock                  -> TakeLog.event("knock", {who = charId})
--   * Acting actions (punch, slip, leap, power, gesture...) -> TakeLog.event(action, {who = id, target = targetId})
--   * Sfx.play(cat)              -> TakeLog.sound(cat)
--   * dialogue lines when shown  -> TakeLog.line(who, to, text, dur, face)
--   * TakeLog.export() is read by record.py over MCP after the take:
--       python tools/studio_mcp.py lua Server -e "return game:GetService('ServerStorage').CrashTakeLog.Value"

local HttpService = game:GetService("HttpService")
local ServerStorage = game:GetService("ServerStorage")

local TakeLog = {}

local goClock = nil
local log = nil

local function now()
	return goClock and (os.clock() - goClock) or 0
end

local function round(x)
	return math.floor(x * 1000 + 0.5) / 1000
end

local function holder()
	local v = ServerStorage:FindFirstChild("CrashTakeLog")
	if not v then
		v = Instance.new("StringValue")
		v.Name = "CrashTakeLog"
		v.Parent = ServerStorage
	end
	return v
end

function TakeLog.start(scene)
	goClock = os.clock()
	log = {
		version = 1,
		scene = scene.name,
		title = scene.title,
		characters = {},
		vehicles = {},
		events = {},
		sounds = {},
		dialogue = {},
	}
	for id, spec in pairs(scene.characters or {}) do
		log.characters[id] = { label = spec.label or spec.name or id, cast = spec.cast, role = spec.role, color = spec.color }
	end
	for id, spec in pairs(scene.vehicles or {}) do
		log.vehicles[id] = { model = spec.model or spec.asset, driver = spec.driver, rider = spec.rider }
	end
	holder().Value = ""
end

function TakeLog.event(kind, info)
	if not log then return end
	local e = { t = round(now()), kind = kind }
	for k, v in pairs(info or {}) do
		if typeof(v) == "Vector3" then
			e[k] = { round(v.X), round(v.Y), round(v.Z) }
		elseif type(v) ~= "table" and typeof(v) ~= "Instance" then
			e[k] = v
		end
	end
	table.insert(log.events, e)
end

function TakeLog.sound(cat)
	if not log then return end
	table.insert(log.sounds, { t = round(now()), cat = cat })
end

function TakeLog.line(who, to, text, dur, face)
	if not log then return end
	table.insert(log.dialogue, { t = round(now()), dur = dur and round(dur) or nil, who = who, to = to, text = text, face = face })
end

-- Mark the climax: the scene can name it, else the fastest impact wins.
local function markClimax()
	local best, bestSpeed = nil, -1
	for _, e in ipairs(log.events) do
		if e.climax then return end
		if e.kind == "impact" and (e.speed or 0) > bestSpeed then
			best, bestSpeed = e, e.speed or 0
		end
	end
	if best then best.climax = true end
end

function TakeLog.export()
	if not log then return "" end
	markClimax()
	local json = HttpService:JSONEncode(log)
	holder().Value = json
	return json
end

return TakeLog
