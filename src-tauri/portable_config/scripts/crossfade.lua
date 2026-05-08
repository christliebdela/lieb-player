-- Lieb Player Crossfade Script
-- Smoothly fades audio between tracks

local options = {
    enabled = true,
    duration = 2.0,
}

local function apply_fade()
    if not options.enabled then return end
    
    local d = options.duration
    -- Reset any existing filters and add the fade-in
    mp.commandv("af", "add", "lavfi=[afade=t=in:st=0:d=" .. d .. "]")
    mp.msg.info("Lieb Player: Applied crossfade (" .. d .. "s)")
end

-- Trigger fade every time a new track starts
mp.register_event("file-loaded", function()
    apply_fade()
end)

-- Sync with React UI
mp.observe_property("user-data/lieb/crossfade", "string", function(_, val)
    options.enabled = (val == "yes")
end)

mp.observe_property("user-data/lieb/crossfade-duration", "number", function(_, val)
    if val then options.duration = val end
end)

-- Ensure we don't stay paused between tracks
mp.observe_property("idle", "bool", function(_, idle)
    if idle and mp.get_property_number("playlist-count", 0) > 0 then
        mp.command("playlist-next")
    end
end)
