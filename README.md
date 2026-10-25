<div align="center">
<img src="thumb.png">

[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-informational)](LICENSE) [![Release](https://img.shields.io/github/v/release/K1tsune12/decky-steamgriddb-kitsune)](https://github.com/K1tsune12/decky-steamgriddb-kitsune/releases/latest)
</div>

<h1 align="center">🦊 SteamGridDB Kitsune Edition for Decky Loader</h1>

<p align="center">A faster, more stable build of the SteamGridDB plugin. Browse and manage Steam artwork from SteamGridDB or your local files, right from gaming mode.</p>

<img src="docs/capsule.png" width="33.33%"><img src="docs/manage.png" width="33.33%"><img src="docs/filters.png" width="33.33%">

## ✨ What's different in this edition

### ⚡ Performance
- **2.5x faster to load at boot.** Steam module lookups now wait until Steam is idle, and heavy parts (markdown, QR codes) load only when you open them. The startup bundle went from 1.1 MB to 555 KB.
- **Near zero CPU while you browse.** Measured on a Steam Deck: 0 ms while idle and about 1 ms over 15 seconds of browsing with square capsules on.

### 🐛 Fixes
- 🔋 **No more side effects on the rest of Steam** (such as the false "slow charger" warning). Steam component lookups no longer leave React hooks patched until Steam restarts.
- 🏠 **Home tabs work with square or matching capsules.** "What's New", "Friends" and "Recommended" switch again, and the recents row no longer jumps back while scrolling.
- 🔁 **No more constant refreshing** in the Non-Steam tab and in collections with square capsules.
- ⏳ **No more endless loading.** Network errors, timeouts and blocked responses now stop the spinner and show a clear message.
- 🖼️ **Non-Steam icons apply instantly**, no Steam restart needed.
- 📁 A clear error when the artwork folder is read-only, and Steam is also looked up in Flatpak, Snap and other non default locations.

### 🎁 New features
- 🏆 **Apply All Official:** set every official Steam artwork (capsule, wide capsule, hero, logo and icon) in one go. Great for non-Steam games.
- 🔀 **Use as another type:** open an artwork's details to use it as a capsule, wide capsule, hero or logo. Handy when a game only has one kind of artwork.

## 📦 Installation
1. Install [Decky Loader](https://wiki.deckbrew.xyz/en/user-guide/install).
2. Download `SteamGridDB.zip` from the [latest release](https://github.com/K1tsune12/decky-steamgriddb-kitsune/releases/latest).
3. In Decky, open **Settings**, turn on **Developer mode**, then go to the **Developer** tab and choose **Install Plugin from ZIP File**.

It replaces the regular SteamGridDB plugin and keeps your settings.

## 🎮 Usage
Select "Change Artwork..." from a game context menu.

You can access the menu by focusing on a game in your library and pressing <picture><source media="(prefers-color-scheme: dark)" srcset="docs/start-light.svg"><source media="(prefers-color-scheme: light)" srcset="docs/start-dark.svg"><img height="16px" alt="Start" src="docs/start-dark.svg"></picture>.
Or by using the <picture><source media="(prefers-color-scheme: dark)" srcset="docs/menucog-light.svg"><source media="(prefers-color-scheme: light)" srcset="docs/menucog-dark.svg"><img height="16px" alt="Cog" src="docs/menucog-dark.svg"></picture> button on a game page.

<img src="docs/gamecontextmenu.png" height="300px">

## 🧩 All features
- Browse assets from SteamGridDB for the selected game.
- Support for non-Steam shortcuts and Source/GoldSrc mods.
- Change icons for Steam or non-Steam shortcuts.
- Pick images from the local file system.
- Apply invisible assets.
- Logo anchor point positioner and resizer.
- Square capsules.
- Change the capsule type of the recently played game.
- Apply all official artwork at once.
- Use any artwork as another asset type.

# 💜 Credits
This is a modified version of the [SteamGridDB plugin for Decky Loader](https://github.com/SteamGridDB/decky-steamgriddb), created by [Jozen Blue Martinez](https://jozen.blue/) and Travis Lane (Tormak) with the help of many contributors. All the original work belongs to them, so go give the original project some love and consider [supporting SteamGridDB](https://www.patreon.com/steamgriddb).

**Kitsune Edition:** [K1tsune12](https://github.com/K1tsune12)  
**Early Testing:** Emenesu, Mr. Mendelli  
**Development Help:** [SDH Discord](https://discord.gg/ZU74G2NJzk)  
**Localisation:**
https://crowdin.com/project/decky-steamgriddb
| Language | Translators |
| - | - |
| **Čeština** | zenobit, theczechczech |
| **Dansk** | Jakob Frank Mogensen |
| **Deutsch** | Kurikuo, benutzer_artur7, Anja, FL0W, Remirax, LittleFreak, 'bignutty, Tom Taylor |
| **Español-España** | Andrea Laguillo, Kam, m0uch0 |
| **Español-Latinoamérica** | Kam, Knux03 |
| **Français** | Michael Jean, Xunkar |
| **Magyar** | minttuNB, BudaiChris |
| **Italiano** | SpagottoB37, RodoMa92, federico-ntr |
| **Nederlands** | Phanpy100 (Fanny), Jannes Verlinde |
| **Norsk** | minttuNB |
| **Polski** | DRS, Michał Kwiatkowski, MAX0R, Szymon Kucharski, minttuNB |
| **Português-Brasil** | Oregano, Thomas Eric |
| **Português** | Kokasgui, Ev1lbl0w |
| **Română** | Munt |
| **Suomi** | Jage |
| **Svenska** | Moneyman Dan, Super, Daniel Nylander |
| **Türkçe** | Bilgehan Ceviz, Sib &#124; Twig |
| **Ελληνικά** | Emenesu |
| **Русский** | fycher, LostHikking |
| **Українська** | Veydzher, Kefir |
| **한국어** | yor42, sua (sua_owo) |
| **日本語** | Nes, Hogman |
| **正體中文** | mingyc |
| **简体中文** | zhzy0077, XHXIAIEIN, simon3000 |

## 📄 License
[GPL-3.0-or-later](LICENSE), same as the original project. This edition was modified from SteamGridDB/decky-steamgriddb version 1.8.1, and the full list of changes is in the commit history.
