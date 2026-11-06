// ================= V61: settings hook for the model detail pass =================
try { if (SETS.GRAPHICS && !SETS.GRAPHICS.some(r => r[0] === 'detail')) SETS.GRAPHICS.push(['detail', 'tog', 'Model detail', 'Panel lines, rim light and extra parts on ships (reload to apply)']); if (SET.detail === undefined) SET.detail = true; } catch (e) { }
