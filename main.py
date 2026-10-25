import os
from platform import system
from os import W_OK, access
from urllib.request import Request, urlopen
from urllib.parse import urlparse
from base64 import b64encode
from pathlib import Path
from shutil import copyfile
from settings import SettingsManager # type: ignore
from helpers import get_ssl_context # type: ignore
import decky # type: ignore

WINDOWS = system() == "Windows"

if WINDOWS:
    from winreg import QueryValueEx, OpenKey, HKEY_CURRENT_USER

# Seconds before a stalled download is abandoned instead of hanging the UI
DOWNLOAD_TIMEOUT = 30

_steam_path = None

def get_steam_path():
    global _steam_path
    if _steam_path is not None:
        return _steam_path

    if WINDOWS:
        _steam_path = Path(QueryValueEx(OpenKey(HKEY_CURRENT_USER, r"Software\Valve\Steam"), "SteamPath")[0])
        return _steam_path

    home = Path(decky.DECKY_USER_HOME)
    candidates = [
        os.environ.get("STEAM_PATH"),
        home / '.local' / 'share' / 'Steam',
        home / '.steam' / 'steam',
        home / '.steam' / 'root',
        home / '.var' / 'app' / 'com.valvesoftware.Steam' / '.local' / 'share' / 'Steam',
        home / 'snap' / 'steam' / 'common' / '.local' / 'share' / 'Steam',
    ]
    for candidate in candidates:
        if candidate and (Path(candidate) / 'userdata').is_dir():
            _steam_path = Path(candidate).resolve()
            break
    else:
        _steam_path = home / '.local' / 'share' / 'Steam'

    decky.logger.info("Using Steam path %s" % _steam_path)
    return _steam_path

def get_steam_userdata():
    return get_steam_path() / 'userdata'

def get_steam_libcache():
    return get_steam_path() / 'appcache' / 'librarycache'

def get_steam_icon_dir(appid):
    return get_steam_libcache() / str(appid)

def get_steam_icon_name(icon_hash):
    return "%s.jpg" % icon_hash

def get_userdata_config(steam32):
    return get_steam_userdata() / steam32 / 'config'

def ensure_writable_dir(directory):
    directory = Path(directory)
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        raise Exception("Can't create %s, check the folder permissions" % directory)
    if not access(directory, W_OK):
        raise Exception("%s is read-only, check the folder permissions" % directory)
    return directory

def fetch_url(url):
    req = Request(url, headers={'User-Agent': 'decky-steamgriddb backend'})
    with urlopen(req, context=get_ssl_context(), timeout=DOWNLOAD_TIMEOUT) as res:
        if res.status != 200:
            raise Exception("Download failed with HTTP %s" % res.status)
        return res.read()

class Plugin:
    async def _main(self):
        self.settings = SettingsManager(name="steamgriddb", settings_directory=decky.DECKY_PLUGIN_SETTINGS_DIR)

    async def _unload(self):
        pass

    async def download_as_base64(self, url=''):
        return b64encode(fetch_url(url)).decode('utf-8')

    async def read_file_as_base64(self, path=''):
        with open(path, 'rb') as image_file:
            return b64encode(image_file.read()).decode('utf-8')

    async def get_local_start(self):
        return decky.DECKY_USER_HOME

    async def download_file(self, url='', output_dir='', file_name=''):
        decky.logger.debug({url, output_dir, file_name})
        output_file = ensure_writable_dir(output_dir) / file_name
        content = fetch_url(url)
        with open(output_file, mode='wb') as f:
            f.write(content)
        return str(output_file)

    async def save_shortcut_icon_from_path(self, appid, owner_id, path):
        ext = Path(path).suffix
        output_file = ensure_writable_dir(get_userdata_config(owner_id) / 'grid') / ("%s_icon%s" % (appid, ext))
        if Path(path).resolve() != output_file.resolve():
            copyfile(path, output_file)
        return str(output_file)

    async def save_shortcut_icon_from_url(self, appid, owner_id, url):
        ext = Path(urlparse(url).path).suffix
        return await self.download_file(url, str(get_userdata_config(owner_id) / 'grid'), file_name="%s_icon%s" % (appid, ext))

    async def set_steam_icon_from_url(self, appid, url, icon_hash):
        # Poison the cache through a temp file, Steam restores the original icon
        # if it catches its cache file being written to directly
        output_dir = ensure_writable_dir(get_steam_icon_dir(appid))
        icon_name = get_steam_icon_name(icon_hash)
        temp_path = output_dir / ("%s_temp" % icon_name)
        try:
            await self.download_file(url, str(output_dir), file_name=temp_path.name)
        except Exception:
            temp_path.unlink(missing_ok=True)
            raise
        output_file = output_dir / icon_name
        temp_path.replace(output_file)
        return str(output_file)

    async def set_steam_icon_from_path(self, appid, path, icon_hash):
        # Poison the cache through a temp file, Steam restores the original icon
        # if it catches its cache file being written to directly
        output_dir = ensure_writable_dir(get_steam_icon_dir(appid))
        icon_name = get_steam_icon_name(icon_hash)
        temp_path = output_dir / ("%s_temp" % icon_name)
        copyfile(path, temp_path)
        output_file = output_dir / icon_name
        temp_path.replace(output_file)
        return str(output_file)

    async def set_setting(self, key, value):
        self.settings.setSetting(key, value)

    async def get_setting(self, key, fallback):
        return self.settings.getSetting(key, fallback)

    async def _migration(self):
        decky.migrate_settings(str(Path(decky.DECKY_HOME) / "settings" / "steamgriddb.json"))
