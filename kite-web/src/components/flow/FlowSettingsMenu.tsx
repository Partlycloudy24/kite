import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useHookedTheme } from "@/lib/hooks/theme";
import { useEditorSettings } from "@/lib/hooks/useEditorSettings";
import { cn } from "@/lib/utils";
import {
  LaptopIcon,
  MoonStarIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";

export default function FlowSettingsMenu() {
  const { theme, setTheme } = useHookedTheme();
  const { showUndoRedo, showShare, setShowUndoRedo, setShowShare } =
    useEditorSettings();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title="Settings"
          aria-label="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-4 space-y-4 shadow-lg rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm text-foreground">
            Settings
          </div>
        </div>

        <Separator />

        {/* Theme */}
        <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              theme === "light"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SunIcon className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              theme === "dark"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MoonStarIcon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme("system")}
            className={cn(
              "flex items-center justify-center space-x-1.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              theme === "system"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LaptopIcon className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>

        <Separator />

        {/* Editor Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label
                htmlFor="setting-undo-redo"
                className="text-sm font-medium cursor-pointer"
              >
                Show undo/redo
              </Label>
              <div className="text-xs text-muted-foreground">
                Display undo and redo buttons in the top bar
              </div>
            </div>
            <Switch
              id="setting-undo-redo"
              checked={showUndoRedo}
              onCheckedChange={setShowUndoRedo}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label
                htmlFor="setting-share"
                className="text-sm font-medium cursor-pointer"
              >
                Show Share
              </Label>
              <div className="text-xs text-muted-foreground">
                Display the share button in the top bar
              </div>
            </div>
            <Switch
              id="setting-share"
              checked={showShare}
              onCheckedChange={setShowShare}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
