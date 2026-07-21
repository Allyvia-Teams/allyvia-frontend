import { createContext, ReactNode } from 'react';

// project imports
import defaultConfig, { MenuOrientation, ThemeMode, ThemeDirection } from 'config';
import useLocalStorage from 'hooks/useLocalStorage';

// types
import { BrandTheme, CustomizationProps, FontFamily, I18n, PresetColor } from 'types/config';

// initial state
const initialState: CustomizationProps = {
  ...defaultConfig,
  onChangeBrandTheme: () => {},
  onChangeMenuOrientation: () => {},
  onChangeMiniDrawer: () => {},
  onChangeMode: () => {},
  onChangePresetColor: () => {},
  onChangeLocale: () => {},
  onChangeDirection: () => {},
  onChangeContainer: () => {},
  onChangeFontFamily: () => {},
  onChangeBorderRadius: () => {},
  onChangeOutlinedField: () => {},
  onReset: () => {}
};

// ==============================|| CONFIG CONTEXT & PROVIDER ||============================== //

const ConfigContext = createContext(initialState);

type ConfigProviderProps = {
  children: ReactNode;
};

function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useLocalStorage('berry-config-vite-ts', {
    menuOrientation: initialState.menuOrientation,
    miniDrawer: initialState.miniDrawer,
    fontFamily: initialState.fontFamily,
    borderRadius: initialState.borderRadius,
    outlinedFilled: initialState.outlinedFilled,
    mode: initialState.mode,
    presetColor: initialState.presetColor,
    i18n: initialState.i18n,
    themeDirection: initialState.themeDirection,
    container: initialState.container,
    brandTheme: initialState.brandTheme,
    headingFontFamily: initialState.headingFontFamily
  });

  const onChangeBrandTheme = (brandTheme: BrandTheme) => {
    setConfig({
      ...config,
      brandTheme
    });
  };

  const onChangeMenuOrientation = (menuOrientation: MenuOrientation) => {
    setConfig({
      ...config,
      menuOrientation
    });
  };

  const onChangeMiniDrawer = (miniDrawer: boolean) => {
    setConfig({
      ...config,
      miniDrawer
    });
  };

  const onChangeMode = (mode: ThemeMode) => {
    setConfig({
      ...config,
      mode
    });
  };

  const onChangePresetColor = (presetColor: PresetColor) => {
    setConfig({
      ...config,
      presetColor
    });
  };

  const onChangeLocale = (i18n: I18n) => {
    setConfig({
      ...config,
      i18n
    });
  };

  const onChangeDirection = (themeDirection: ThemeDirection) => {
    setConfig({
      ...config,
      themeDirection
    });
  };

  const onChangeContainer = (container: boolean) => {
    setConfig({
      ...config,
      container
    });
  };

  const onChangeFontFamily = (fontFamily: FontFamily) => {
    setConfig({
      ...config,
      fontFamily
    });
  };

  const onChangeBorderRadius = (event: Event, newValue: number | number[]) => {
    setConfig({
      ...config,
      borderRadius: newValue as number
    });
  };

  const onChangeOutlinedField = (outlinedFilled: boolean) => {
    setConfig({
      ...config,
      outlinedFilled
    });
  };

  const onReset = () => {
    setConfig({ ...defaultConfig });
  };

  return (
    <ConfigContext
      value={{
        ...config,
        // Design-system owned values: enforce app defaults over any stale
        // persisted config so the UI refresh applies to returning sessions.
        // User preferences (mode, i18n, direction, menu state) still persist.
        // NB: brandTheme is intentionally NOT reset here — it comes from `...config`
        // and drives per-company theming through palette.tsx / typography.tsx.
        fontFamily: defaultConfig.fontFamily,
        borderRadius: defaultConfig.borderRadius,
        outlinedFilled: defaultConfig.outlinedFilled,
        presetColor: defaultConfig.presetColor,
        onChangeBrandTheme,
        onChangeMenuOrientation,
        onChangeMiniDrawer,
        onChangeMode,
        onChangePresetColor,
        onChangeLocale,
        onChangeDirection,
        onChangeContainer,
        onChangeFontFamily,
        onChangeBorderRadius,
        onChangeOutlinedField,
        onReset
      }}
    >
      {children}
    </ConfigContext>
  );
}

export { ConfigProvider, ConfigContext };
