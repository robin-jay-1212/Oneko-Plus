//todo: fix config name toggles not updating live sometimes
//distance from cursor variable
//display flag

const Applet = imports.ui.applet;
const GLib = imports.gi.GLib;
const St = imports.gi.St;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;
const Gettext = imports.gettext;
const Settings = imports.ui.settings;
const Lang = imports.lang;

const UUID = "onekoPlus@robinjay";
function _(str) {
    return Gettext.dgettext(UUID, str);
}

class onekoPlus extends Applet.IconApplet {
    constructor(metadata, orientation, panel_height, instanceId) {
        super(orientation, panel_height, instanceId);
        this.metadata = metadata;

        try {
            // 1. Initialize settings.
            this.settings = new Settings.AppletSettings(this, "onekoPlus@robinjay", instanceId);

            // 2. Bind the variables to the JSON keys
            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "savedPalettes", "savedPalettes", this._buildMenu.bind(this), null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "currentSpeed", "currentSpeed", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "currentFg", "currentFg", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "currentBg", "currentBg", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "lastSprite", "lastSprite", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "onekoActive", "onekoActive", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "chaseMode", "chaseMode", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "savedOutfits", "savedOutfits", this._buildMenu.bind(this), null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "showPaletteInTitle", "showPaletteInTitle", this._buildMenu.bind(this), null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "showOutfitInTitle", "showOutfitInTitle", this._buildMenu.bind(this), null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "lastOutfitName", "lastOutfitName", null, null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "showSakura", "showSakura", this._buildMenu.bind(this), null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "showTomoyo", "showTomoyo", this._buildMenu.bind(this), null);

            // 3. Setup Internal Variables
            this.spawnTimer = null;

            // 4. Setup Icon
            let iconPath = this.metadata.path + "/icons/running.png";
            if (GLib.file_test(iconPath, GLib.FileTest.EXISTS)) {
                this.set_applet_icon_path(iconPath);
            } else {
                this.set_applet_icon_name("image-missing");
            }

            this.set_applet_tooltip(_("Oneko Plus: Select a Companion!"));

            // 5. Initialize the Menu System
            this.menuManager = new PopupMenu.PopupMenuManager(this);
            this.menu = new Applet.AppletPopupMenu(this, orientation);
            this.menuManager.addMenu(this.menu);

            // 6. Build the menu items
            this._buildMenu();
            this._updateIcon();

            if (this.lastSprite && this.onekoActive) {
                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
                    this._spawnCurrentConfig(this.lastSprite);
                    return GLib.SOURCE_REMOVE;
                });
            }

        } catch (e) {
            global.logError("OnekoPlus Setup Error: " + e);
        }
    }

    _buildMenu() {
        this.menu.removeAll();

        // --- SPEED SLIDER ---
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("Speed (Fast ↔ Slow)"), { reactive: false }));

        let savedSpeed = Number(this.settings.getValue("currentSpeed")) || 18;
        let sliderPos = (32 - savedSpeed) / 27;
        this.speedSlider = new PopupMenu.PopupSliderMenuItem(sliderPos);

        this.speedSlider.connect("value-changed", (slider, value) => {
            let newSpeed = Math.floor(32 - (value * 27));

            this.currentSpeed = newSpeed;
            this.settings.setValue("currentSpeed", parseInt(newSpeed));

            if (this.spawnTimer) GLib.source_remove(this.spawnTimer);
            this.spawnTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
                this.spawnTimer = null;
                return GLib.SOURCE_REMOVE;
            });
        });

        this.menu.addMenuItem(this.speedSlider);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- PALETTE SWAPPER ---
        //Palette title logic
        let fg = this.currentFg || "black";
        let bg = this.currentBg || "white";
        let paletteTitle = this.showPaletteInTitle ? `🎨 ${fg} on ${bg}` : `🎨 Palette Swapper`;
        let colorSubMenu = new PopupMenu.PopupSubMenuMenuItem(paletteTitle);

        const palettes = [
            { name: "Classic", fg: "black", bg: "white" },
            { name: "Inverted", fg: "white", bg: "black" },
            { name: "Midnight", fg: "yellow", bg: "midnightblue" },
            { name: "Downwell", fg: "red", bg: "black" },
            { name: "Fallout", fg: "green", bg: "black" },
            { name: "Strawby Milk", fg: "hotpink", bg: "lavenderblush" },
            { name: "Mint", fg: "mediumseagreen", bg: "mintcream" },
            { name: "Baby Blue", fg: "cornflowerblue", bg: "aliceblue" },
            { name: "Sepia", fg: "sienna", bg: "wheat" },
            { name: "Cappucino", fg: "saddlebrown", bg: "antiquewhite" },
            { name: "Deep Sea", fg: "LightSeaGreen", bg: "DarkSlateGrey" },
            { name: "Abyss", fg: "steelblue", bg: "black" },
            { name: "Halloween", fg: "darkorange", bg: "black" },
            { name: "Tiger", fg: "black", bg: "darkorange" }
        ];

        palettes.forEach(p => {
            let pItem = new PopupMenu.PopupMenuItem(p.name);
            pItem.connect('activate', () => {
                this.currentFg = p.fg;
                this.settings.setValue("currentFg", p.fg);
                this.currentBg = p.bg;
                this.settings.setValue("currentBg", p.bg);
                if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
            });
            colorSubMenu.menu.addMenuItem(pItem);
        });

        colorSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let randomItem = new PopupMenu.PopupMenuItem(_("🍀 Feeling Lucky?"));
        randomItem.connect('activate', () => this._applyRandomPalette());
        colorSubMenu.menu.addMenuItem(randomItem);

        let customItem = new PopupMenu.PopupMenuItem(_("🖌️ Custom Palette"));
        customItem.connect('activate', () => this._openColorInput());
        colorSubMenu.menu.addMenuItem(customItem);

        if (this.savedPalettes && this.savedPalettes.length > 0) {
            colorSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            colorSubMenu.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("Saved Custom Palettes"), { reactive: false }));

            this.savedPalettes.forEach((p, index) => {
                let themeItem = new PopupMenu.PopupSubMenuMenuItem(p.name);

                let loadItem = new PopupMenu.PopupMenuItem(_("Apply"));
                loadItem.connect('activate', () => {
                    this.currentFg = p.fg;
                    this.currentBg = p.bg;
                    if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
                });
                themeItem.menu.addMenuItem(loadItem);

                let deleteItem = new PopupMenu.PopupMenuItem(_("Delete"));
                deleteItem.connect('activate', () => {
                    let cmd = `zenity --question --title="Delete Palette" --text="Delete '${p.name}'?"`;
                    Util.spawnCommandLineAsyncIO(cmd, (stdout, stderr, exitCode) => {
                        if (exitCode === 0) {
                            let temp = [...this.savedPalettes];
                            temp.splice(index, 1);
                            this.savedPalettes = temp;
                            this._buildMenu();
                        }
                    });
                });
                themeItem.menu.addMenuItem(deleteItem);

                colorSubMenu.menu.addMenuItem(themeItem);
            });
        }

        colorSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let saveBtn = new PopupMenu.PopupMenuItem(_("💾 Save Current Palette"));
        saveBtn.connect('activate', () => this._saveCurrentPalette());
        colorSubMenu.menu.addMenuItem(saveBtn);

        this.menu.addMenuItem(colorSubMenu);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- OUTFIT SWAPPER ---
        // Outfit title logic
        let outfitTitle = this.showOutfitInTitle && this.lastOutfitName ? `👕 ${this.lastOutfitName}` : `👕 Saved Outfits`;
        let outfitSubMenu = new PopupMenu.PopupSubMenuMenuItem(outfitTitle);

        if (this.savedOutfits && this.savedOutfits.length > 0) {
            this.savedOutfits.forEach((o, index) => {
                let outfitItem = new PopupMenu.PopupSubMenuMenuItem(o.name);

                let applyItem = new PopupMenu.PopupMenuItem(_("Apply"));
                applyItem.connect('activate', () => {
                    // Apply all saved properties
                    this.currentFg = o.fg;
                    this.currentBg = o.bg;
                    this.chaseMode = o.chaseMode || "none";
                    this.settings.setValue("currentFg", o.fg);
                    this.settings.setValue("currentBg", o.bg);
                    this.settings.setValue("chaseMode", o.chaseMode || "none");
                    this.onekoActive = true;
                    this.settings.setValue("onekoActive", true);
                    this._updateIcon();
                    this.lastSprite = o.sprite;
                    this._spawnCurrentConfig(o.sprite);
                    this.lastOutfitName = o.name;
                    this.settings.setValue("lastOutfitName", o.name);
                    // Rebuild menu so palette label and chase switches update
                    this._buildMenu();
                });
                outfitItem.menu.addMenuItem(applyItem);

                let deleteItem = new PopupMenu.PopupMenuItem(_("Delete"));
                deleteItem.connect('activate', () => {
                    let cmd = `zenity --question --title="Delete Outfit" --text="Delete '${o.name}'?"`;
                    Util.spawnCommandLineAsyncIO(cmd, (stdout, stderr, exitCode) => {
                        if (exitCode === 0) {
                            let temp = [...this.savedOutfits];
                            temp.splice(index, 1);
                            this.savedOutfits = temp;
                            this.settings.setValue("savedOutfits", temp);
                            this._buildMenu();
                        }
                    });
                });
                outfitItem.menu.addMenuItem(deleteItem);

                outfitSubMenu.menu.addMenuItem(outfitItem);
            });
        }

        outfitSubMenu.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let saveOutfitBtn = new PopupMenu.PopupMenuItem(_("💾 Save Current Outfit"));
        saveOutfitBtn.connect('activate', () => this._saveCurrentOutfit());
        outfitSubMenu.menu.addMenuItem(saveOutfitBtn);

        this.menu.addMenuItem(outfitSubMenu);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- CHASE MODE ---
        let chaseSubMenu = new PopupMenu.PopupSubMenuMenuItem(_("🎯 Chase Mode"));

        let chaseNoneItem = new PopupMenu.PopupSwitchMenuItem(_("🐭 Mouse"), this.chaseMode === "none" || !this.chaseMode);
        let chaseFocusItem = new PopupMenu.PopupSwitchMenuItem(_("🔍 Focus"), this.chaseMode === "tofocus");
        let chaseWindowItem = new PopupMenu.PopupSwitchMenuItem(_("🪟 Window"), this.chaseMode === "towindow");

        chaseNoneItem.connect('toggled', (item) => {
            if (!item.state) { item.setToggleState(true); return; }
            this.chaseMode = "none";
            this.settings.setValue("chaseMode", "none");
            chaseWindowItem.setToggleState(false);
            chaseFocusItem.setToggleState(false);
            if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
        });

        chaseFocusItem.connect('toggled', (item) => {
            if (!item.state) { item.setToggleState(true); return; }
            this.chaseMode = "tofocus";
            this.settings.setValue("chaseMode", "tofocus");
            chaseNoneItem.setToggleState(false);
            chaseWindowItem.setToggleState(false);
            if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
        });

        chaseWindowItem.connect('toggled', (item) => {
            if (!item.state) { item.setToggleState(true); return; }
            this.chaseMode = "towindow";
            this.settings.setValue("chaseMode", "towindow");
            chaseNoneItem.setToggleState(false);
            chaseFocusItem.setToggleState(false);
            if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);
            Util.spawnCommandLine(`zenity --info --title="Chase Window (experimental)" --text="You have enabled Chase Window Mode. First, toggle Oneko again by selecting a sprite or middle-clicking the applet icon. Your cursor should become the associated Oneko cursor sprite. Then, click the window you want your desktop companion to chase. Voila!" --timeout=20`);

        });

        chaseSubMenu.menu.addMenuItem(chaseNoneItem);
        chaseSubMenu.menu.addMenuItem(chaseFocusItem);
        chaseSubMenu.menu.addMenuItem(chaseWindowItem);


        this.menu.addMenuItem(chaseSubMenu);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // --- SPRITES ---
        let options = [
            { label: "Neko", cmd: "oneko" },
            { label: "Tora", cmd: "oneko -tora" },
            { label: "Puppy", cmd: "oneko -dog" }

        ];

        if (this.showSakura !== false) options.push({ label: "Sakura", cmd: "oneko -sakura" });
        if (this.showTomoyo !== false) options.push({ label: "Tomoyo", cmd: "oneko -tomoyo" });

        options.forEach(option => {
            let item = new PopupMenu.PopupMenuItem(_(option.label));
            item.connect('activate', () => {
                this.lastSprite = option.cmd;
                this.onekoActive = true;
                this.settings.setValue("onekoActive", true);
                this._updateIcon();
                this._spawnCurrentConfig(option.cmd);
            });
            this.menu.addMenuItem(item);
        });

        // --- UTILITIES ---        
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let stopItem = new PopupMenu.PopupMenuItem(_("Quit"));
        stopItem.connect('activate', () => {
            this.onekoActive = false;
            this.settings.setValue("onekoActive", false);
            this._updateIcon();
            Util.spawnCommandLine("pkill -15 oneko");
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                Util.spawnCommandLine("xsetroot -cursor_name left_ptr");
                return GLib.SOURCE_REMOVE;
            });
        });
        this.menu.addMenuItem(stopItem);
    }

    // Assembles the full command string
    _spawnCurrentConfig(spriteCmd) {
        if (!spriteCmd) return;
        this.lastSprite = spriteCmd;
        this.onekoActive = true;
        this.settings.setValue("onekoActive", true);
        this._updateIcon();
        let speed = parseInt(this.settings.getValue("currentSpeed")) || 18;
        let fg = this.currentFg || "black";
        let bg = this.currentBg || "white";
        let chaseFlag = "";
        if (this.chaseMode === "towindow") chaseFlag = " -towindow";
        if (this.chaseMode === "tofocus") chaseFlag = " -tofocus";
        let fullCmd = `${spriteCmd} -speed ${speed} -fg "${fg}" -bg "${bg}"${chaseFlag}`;
        this._launchOneko(fullCmd);
    }

    _launchOneko(command) {
        Util.spawnCommandLine("pkill -15 oneko");

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
            Util.spawnCommandLine("xsetroot -cursor_name left_ptr");
            return GLib.SOURCE_REMOVE;
        });

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            Util.spawnCommandLine(command);
            return GLib.SOURCE_REMOVE;
        });
    }

    _updateIcon() {
        let runningIcon = this.metadata.path + "/icons/running.png";
        let stoppedIcon = this.metadata.path + "/icons/stopped.png";
        if (this.onekoActive && GLib.file_test(runningIcon, GLib.FileTest.EXISTS)) {
            this.set_applet_icon_path(runningIcon);
        } else if (GLib.file_test(stoppedIcon, GLib.FileTest.EXISTS)) {
            this.set_applet_icon_path(stoppedIcon);
        } else {
            this.set_applet_icon_name("image-missing");
        }
    }

    _saveCurrentOutfit() {
        if (!this.savedOutfits) {
            this.savedOutfits = [];
        }
        if (!this.lastSprite) {
            Util.spawnCommandLine(`zenity --warning --title="Save Outfit" --text="No sprite is currently active!" --timeout=3`);
            return;
        }
        let outfitName = `Outfit ${this.savedOutfits.length + 1}`;
        let cmd = `zenity --entry --title="Save Outfit" --text="Name your outfit:" --entry-text="${outfitName}"`;

        Util.spawnCommandLineAsyncIO(cmd, (stdout, stderr, exitCode) => {
            if (exitCode === 0 && stdout.trim() !== "") {
                let newOutfit = {
                    name: stdout.trim(),
                    sprite: this.lastSprite,
                    fg: this.currentFg || "black",
                    bg: this.currentBg || "white",
                    chaseMode: this.chaseMode || "none"
                };
                let updatedOutfits = [...this.savedOutfits, newOutfit];
                this.savedOutfits = updatedOutfits;
                this.settings.setValue("savedOutfits", updatedOutfits);
                this._buildMenu();
            }
        });
    }

    _openColorInput() {
        let cmd = `zenity --forms --title="Oneko Plus Custom Palette" \
                  --text="Enter X11 color names. (Hint: /usr/share/X11/rgb.txt)" \
                  --add-entry="Outline" \
                  --add-entry="Body"`;
        Util.spawnCommandLineAsyncIO(cmd, (stdout, stderr, exitCode) => {
            if (exitCode === 0 && stdout.trim() !== "") {
                let [fg, bg] = stdout.trim().split('|');
                if (fg) this.currentFg = fg.trim();
                if (bg) this.currentBg = bg.trim();
                if (this.lastSprite) {
                    this._spawnCurrentConfig(this.lastSprite);
                }
            }
        });
    }

    _getX11Colors() {
        try {
            let [ok, contents] = GLib.file_get_contents("/usr/share/X11/rgb.txt");
            if (!ok) return null;

            let text = new TextDecoder().decode(contents);
            let colors = [];

            text.split('\n').forEach(line => {
                line = line.trim();
                if (line === '' || line.startsWith('!')) return;
                let parts = line.split(/\s+/);
                if (parts.length >= 4) {
                    let colorName = parts.slice(3).join(' ');
                    if (colorName.includes('gray')) return; // skip gray spellings
                    colors.push(colorName);
                }
            });

            return colors;
        } catch (e) {
            global.logError("onekoPlus: could not read rgb.txt: " + e);
            return null;
        }
    }

    _applyRandomPalette() {
        let colors = this._getX11Colors();
        if (!colors || colors.length === 0) {
            global.logError("onekoPlus: no colors found in rgb.txt");
            return;
        }

        let fgIndex = Math.floor(Math.random() * colors.length);
        let bgIndex = Math.floor(Math.random() * colors.length);

        let fg = colors[fgIndex];
        let bg = colors[bgIndex];

        this.currentFg = fg;
        this.currentBg = bg;
        this.settings.setValue("currentFg", fg);
        this.settings.setValue("currentBg", bg);

        if (this.lastSprite) this._spawnCurrentConfig(this.lastSprite);

        global.log(`onekoPlus random palette: fg="${fg}" bg="${bg}"`);
    }

    _saveCurrentPalette() {
        if (!this.savedPalettes) {
            this.savedPalettes = [];
        }
        let themeName = `Theme ${this.savedPalettes.length + 1}`;

        let cmd = `zenity --entry --title="Save Custom Palette" --text="Name your new palette:" --entry-text="${themeName}"`;

        Util.spawnCommandLineAsyncIO(cmd, (stdout, stderr, exitCode) => {
            if (exitCode === 0 && stdout.trim() !== "") {
                let newTheme = {
                    name: stdout.trim(),
                    fg: this.currentFg || "black",
                    bg: this.currentBg || "white"
                };
                let updatedPalettes = [...this.savedPalettes, newTheme];
                this.settings.setValue("savedPalettes", updatedPalettes);
                this.savedPalettes = this.settings.getValue("savedPalettes");
                this._buildMenu();
            }
        });
    }

    on_applet_clicked(event) {
        if (event.get_button() !== 2) {
            this.menu.toggle();
        }
    }

    on_applet_middle_clicked(event) {
        if (this.onekoActive) {
            this.onekoActive = false;
            this.settings.setValue("onekoActive", false);
            this._updateIcon();
            Util.spawnCommandLine("pkill -15 oneko");
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
                Util.spawnCommandLine("xsetroot -cursor_name left_ptr");
                return GLib.SOURCE_REMOVE;
            });
        } else {
            if (this.lastSprite) {
                this.onekoActive = true;
                this.settings.setValue("onekoActive", true);
                this._updateIcon();
                this._spawnCurrentConfig(this.lastSprite);
            }
        }
    }

    on_applet_removed_from_panel() {
        if (this.menu) {
            this.menu.destroy();
        }
    }

}

function main(metadata, orientation, panelHeight, instanceId) {
    return new onekoPlus(metadata, orientation, panelHeight, instanceId);
}
