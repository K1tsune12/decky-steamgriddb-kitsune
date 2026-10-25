import SteamLang from './steam-api-language-map';

const STORE_ASSETS_BASE = 'https://shared.steamstatic.com/store_item_assets/steam/apps';

// Same default as the official assets modal: English when available, otherwise the first language
const pickLanguage = (languages: string[]) => {
  const english = SteamLang('en', 'webapi', 'api') as string;
  return languages.indexOf(english) > -1 ? english : languages[0];
};

const fullAssetKeys: [SGDBAssetType, string][] = [
  ['grid_p', 'library_capsule_full'],
  ['hero', 'library_hero_full'],
  ['logo', 'library_logo_full'],
];

/**
 * Official Steam artwork URLs for every asset type that has one, best quality first.
 * `data` is the `external_platform_data` of a SteamGridDB game.
 */
const getOfficialAssetUrls = (data: any): Partial<Record<SGDBAssetType, string[]>> => {
  const steam = data?.steam?.[0];
  const meta = steam?.metadata;
  if (!meta) return {};

  const base = `${STORE_ASSETS_BASE}/${steam.id}`;
  const query = `?t=${meta.store_asset_mtime}`;
  const urls: Partial<Record<SGDBAssetType, string[]>> = {};

  const headerLanguages = Object.keys(meta.header_image_full ?? {});
  if (headerLanguages.length) {
    const fileName = meta.header_image_full[pickLanguage(headerLanguages)];
    urls.grid_l = [
      `${base}/${fileName.replace(/\.jpg$/, '_2x.jpg')}${query}`,
      `${base}/${fileName}${query}`,
    ];
  }

  for (const [assetType, key] of fullAssetKeys) {
    const languages = Object.keys(meta[key]?.image ?? {});
    if (!languages.length) continue;
    const lang = pickLanguage(languages);
    urls[assetType] = [
      meta[key].image2x?.[lang] && `${base}/${meta[key].image2x[lang]}${query}`,
      `${base}/${meta[key].image[lang]}${query}`,
    ].filter(Boolean);
  }

  if (meta.clienticon) {
    urls.icon = [`https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${steam.id}/${meta.clienticon}.ico`];
  }

  return urls;
};

export default getOfficialAssetUrls;
