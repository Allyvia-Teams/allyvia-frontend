// material-ui
import { alpha, Theme } from '@mui/material/styles';

// project imports
import componentsOverrides from './overrides';
import { ThemeMode } from 'config';

export default function componentStyleOverrides(theme: Theme, borderRadius: number, outlinedFilled: boolean) {
  const mode = theme.palette.mode;
  const bgColor = mode === ThemeMode.DARK ? theme.palette.dark[800] : theme.palette.grey[50];
  // Sidebar active pill follows the brand PRIMARY in both modes (8% light, 12% dark), so it
  // re-themes automatically per company and stays within the ~12% large-surface tint ceiling.
  // (Brand theming — Phase 4 — takes precedence here over develop's neutral nav-rail treatment,
  // since driving brand color into the nav is the whole point of this PR. With no brand set,
  // primary.main is the default Allyvia blue.)
  const menuSelectedBack = mode === ThemeMode.DARK ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08);
  const menuSelected = theme.palette.primary.main;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ':root, body, #root': {
          overflowX: 'hidden',
          width: '100%',
          minWidth: 0,
          // Smooth Light/Dark theme transitions so the toggle in
          // Settings -> Appearance doesn't flash. Scoped to the colors
          // that flip, so layout properties (transform, width, etc.) stay snappy.
          transition: 'background-color 250ms ease, color 250ms ease, border-color 250ms ease'
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box'
        },
        // Cards and surfaces should ease alongside the page background.
        '.MuiPaper-root, .MuiCard-root, .MuiAppBar-root, .MuiDrawer-paper': {
          transition: 'background-color 250ms ease, color 250ms ease, border-color 250ms ease, box-shadow 250ms ease !important'
        },
        // Mirror small (sm) Grid widths down to xs when xs isn't specified,
        // so layouts remain aligned across breakpoints without editing views.
        '@media (max-width: 767.98px)': {
          // Force any inline min-width blocks (e.g., analytics charts) to fit viewport
          '[style*="min-width"]': {
            minWidth: '100% !important'
          },
          // Ensure charts/media scale to container width
          'canvas, svg, .apexcharts-canvas, .apexcharts-canvas svg': {
            maxWidth: '100% !important',
            width: '100% !important'
          },
          '.apexcharts-legend': {
            display: 'flex',
            flexWrap: 'wrap'
          },
          '.MuiGrid2-grid-sm-2': { flexBasis: '16.6667% !important', maxWidth: '16.6667% !important' },
          '.MuiGrid2-grid-sm-3': { flexBasis: '25% !important', maxWidth: '25% !important' },
          '.MuiGrid2-grid-sm-4': { flexBasis: '33.3333% !important', maxWidth: '33.3333% !important' },
          '.MuiGrid2-grid-sm-6': { flexBasis: '50% !important', maxWidth: '50% !important' },
          '.MuiGrid2-grid-sm-8': { flexBasis: '66.6667% !important', maxWidth: '66.6667% !important' },
          '.MuiGrid2-grid-sm-9': { flexBasis: '75% !important', maxWidth: '75% !important' },
          '.MuiGrid2-grid-sm-10': { flexBasis: '83.3333% !important', maxWidth: '83.3333% !important' },
          '.MuiGrid2-grid-sm-12': { flexBasis: '100% !important', maxWidth: '100% !important' }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: '8px',
          minHeight: 38,
          paddingLeft: 14,
          paddingRight: 14,
          fontSize: '0.875rem',
          letterSpacing: '-0.005em',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { boxShadow: 'none' },
          '&:focus-visible': {
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
            outlineOffset: 2
          },
          // Doubled specificity so disabled styling beats per-view sx color
          // hardcodes (e.g. sx={{ color: 'white' }} on contained buttons).
          ...(mode !== ThemeMode.DARK && {
            '&&.Mui-disabled': {
              color: theme.palette.grey[500]
            },
            '&&.MuiButton-contained.Mui-disabled': {
              backgroundColor: theme.palette.grey[100],
              color: theme.palette.grey[500]
            }
          }),
          ...theme.applyStyles('dark', {
            '&.MuiButton-colorWarning': { color: theme.palette.common.black }
          })
        },
        sizeSmall: {
          minHeight: 32,
          paddingLeft: 10,
          paddingRight: 10,
          fontSize: '0.8125rem'
        },
        sizeLarge: {
          minHeight: 44,
          paddingLeft: 20,
          paddingRight: 20
        },
        contained: {
          '&:hover': {
            boxShadow: 'none'
          }
        },
        // Primary CTAs are ink-dark per the design system; brand blue stays
        // for links, tabs, charts and selected states.
        containedPrimary: {
          ...(mode !== ThemeMode.DARK && {
            backgroundColor: theme.palette.grey[900],
            color: '#fff',
            '&:hover': {
              backgroundColor: theme.palette.grey[700]
            },
            '&.Mui-disabled': {
              backgroundColor: theme.palette.grey[100],
              color: theme.palette.grey[500]
            }
          })
        },
        outlined: {
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.grey[200],
          ...(mode !== ThemeMode.DARK && {
            '&.MuiButton-outlinedPrimary, &.MuiButton-outlinedSecondary': {
              color: theme.palette.grey[700],
              borderColor: theme.palette.grey[200],
              '&:hover': {
                borderColor: theme.palette.grey[300],
                backgroundColor: theme.palette.grey[50]
              }
            }
          })
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 36,
          minHeight: 36,
          padding: 6,
          borderRadius: '8px',
          '&:focus-visible': {
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
            outlineOffset: 2
          }
        },
        sizeSmall: {
          minWidth: 28,
          minHeight: 28,
          padding: 4
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 72,
          paddingTop: 8,
          paddingBottom: 8
        }
      }
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '& + .MuiFormControlLabel-label': {
            marginTop: 2
          }
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: mode === ThemeMode.DARK ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : `1px solid ${theme.palette.grey[200]}`,
          '&.MuiPaper-elevation0': {
            border: mode === ThemeMode.DARK ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : `1px solid ${theme.palette.grey[200]}`
          },
          '&.MuiPopover-paper, &.MuiMenu-paper, &.MuiAutocomplete-paper': {
            border: 'none',
            boxShadow:
              mode === ThemeMode.DARK
                ? '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)'
                : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            borderRadius: `${borderRadius}px`
          },
          '&.MuiDrawer-paper': {
            border: 'none',
            borderRight: mode === ThemeMode.DARK ? `1px solid ${alpha(theme.palette.divider, 0.2)}` : `1px solid ${theme.palette.grey[200]}`
          },
          '&.MuiAppBar-root': {
            border: 'none'
          }
        },
        rounded: {
          borderRadius: `${borderRadius}px`
        },
        elevation1: {
          border: 'none',
          boxShadow:
            mode === ThemeMode.DARK
              ? '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
              : '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
        },
        elevation2: {
          border: 'none',
          boxShadow:
            mode === ThemeMode.DARK
              ? '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3)'
              : '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)'
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          color: theme.palette.text.dark,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${mode === ThemeMode.DARK ? alpha(theme.palette.divider, 0.2) : theme.palette.grey[100]}`
        },
        title: {
          fontSize: '0.9375rem',
          fontWeight: 600,
          letterSpacing: '-0.01em'
        },
        action: {
          marginTop: 0,
          marginRight: 0,
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          [theme.breakpoints.down('md')]: {
            width: '100%',
            marginLeft: 0,
            marginTop: 8,
            justifyContent: 'flex-start'
          }
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%'
        }
      }
    },
    MuiCardActions: {
      styleOverrides: {
        root: {
          padding: '24px'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          alignItems: 'center'
        },
        outlined: {
          border: '1px dashed'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: theme.palette.text.primary,
          paddingTop: '8px',
          paddingBottom: '8px',
          minHeight: 38,
          borderRadius: '8px',
          '& .MuiListItemIcon-root': {
            minWidth: 36
          },
          '&.Mui-selected': {
            color: menuSelected,
            backgroundColor: menuSelectedBack,
            fontWeight: 600,
            '&:hover': {
              backgroundColor: mode === ThemeMode.DARK ? alpha(theme.palette.secondary.main, 0.18) : theme.palette.grey[100]
            },
            '& .MuiListItemIcon-root': {
              color: menuSelected
            }
          },
          '&:hover': {
            backgroundColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.05) : theme.palette.grey[100],
            color: theme.palette.text.primary,
            '& .MuiListItemIcon-root': {
              color: theme.palette.text.primary
            }
          }
        }
      }
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: theme.palette.text.primary,
          minWidth: '36px'
        }
      }
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          color: theme.palette.text.dark
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: theme.palette.text.dark,
          '&::placeholder': {
            color: theme.palette.text.secondary,
            fontSize: '0.875rem'
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: outlinedFilled ? bgColor : 'transparent',
          borderRadius: '8px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.grey[200]
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.4) : theme.palette.grey[300]
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: '1.5px'
          },
          '&.MuiInputBase-multiline': {
            padding: 1
          }
        },
        input: {
          fontWeight: 400,
          background: outlinedFilled ? bgColor : 'transparent',
          padding: '10px 12px',
          borderRadius: '8px',
          fontSize: '0.875rem',
          '&.MuiInputBase-inputSizeSmall': {
            padding: '7px 10px',
            '&.MuiInputBase-inputAdornedStart': {
              paddingLeft: 0
            }
          }
        },
        inputAdornedStart: {
          paddingLeft: 4
        },
        notchedOutline: {
          borderRadius: '8px'
        }
      }
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          '&.Mui-disabled': {
            color: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.5) : theme.palette.grey[300]
          }
        },
        mark: {
          backgroundColor: theme.palette.background.paper,
          width: '4px'
        },
        valueLabel: {
          color: mode === ThemeMode.DARK ? theme.palette.primary.main : theme.palette.primary.light
        }
      }
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiAutocomplete-tag': {
            background: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.primary.light,
            borderRadius: 4,
            color: theme.palette.text.dark,
            '.MuiChip-deleteIcon': {
              color: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.8) : theme.palette.primary[200]
            }
          }
        },
        popper: {
          borderRadius: `${borderRadius}px`,
          boxShadow: '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)'
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          '&:focus': {
            backgroundColor: 'transparent'
          }
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          // Soft brand tint per the design system (light blue fill, deep blue glyph)
          color: mode === ThemeMode.DARK ? theme.palette.dark.main : theme.palette.primary.dark,
          background: mode === ThemeMode.DARK ? theme.palette.text.primary : theme.palette.primary.light
        }
      }
    },
    MuiTimelineContent: {
      styleOverrides: {
        root: {
          color: theme.palette.text.dark,
          fontSize: '16px'
        }
      }
    },
    MuiTreeItem: {
      styleOverrides: {
        label: {
          marginTop: 14,
          marginBottom: 14
        }
      }
    },
    MuiTimelineDot: {
      styleOverrides: {
        root: {
          boxShadow: 'none'
        }
      }
    },
    MuiInternalDateTimePickerTabs: {
      styleOverrides: {
        tabs: {
          backgroundColor: mode === ThemeMode.DARK ? theme.palette.dark[900] : theme.palette.primary.light,
          '& .MuiTabs-flexContainer': {
            borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.primary[200]
          },
          '& .MuiTab-root': {
            color: mode === ThemeMode.DARK ? theme.palette.text.secondary : theme.palette.grey[900]
          },
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.dark
          },
          '& .Mui-selected': {
            color: theme.palette.primary.dark
          }
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        flexContainer: {
          borderBottom: '1px solid',
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.12) : theme.palette.grey[100]
        },
        root: {
          minHeight: 44
        },
        indicator: {
          height: 2,
          borderRadius: '2px 2px 0 0',
          backgroundColor: mode === ThemeMode.DARK ? theme.palette.primary.main : theme.palette.grey[900]
        },
        scroller: {
          overflow: 'auto !important'
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 44,
          ...(mode !== ThemeMode.DARK && { color: theme.palette.grey[500] }),
          '&.Mui-selected': {
            fontWeight: 600,
            ...(mode !== ThemeMode.DARK && { color: theme.palette.grey[900] })
          }
        }
      }
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          flexWrap: 'wrap',
          gap: 8,
          [theme.breakpoints.down('md')]: {
            justifyContent: 'flex-start',
            width: '100%'
          }
        }
      }
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          minWidth: 64,
          paddingLeft: 12,
          paddingRight: 12,
          lineHeight: 1.25,
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.grey[300]
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          padding: '12px 0 12px 0',
          borderRadius: `${Math.max(borderRadius, 12)}px`,
          boxShadow:
            mode === ThemeMode.DARK
              ? '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.4)'
              : '0 20px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06)',
          border: 'none'
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          // Subtle brand-tinted hover/selection for table rows. Reads the (brand) primary so the
          // tint follows the company theme; kept low-alpha (<= 12%) so large surfaces stay calm.
          '&.MuiTableRow-hover:hover': {
            backgroundColor: alpha(theme.palette.primary.main, mode === ThemeMode.DARK ? 0.08 : 0.06)
          },
          '&.Mui-selected': {
            backgroundColor: alpha(theme.palette.primary.main, mode === ThemeMode.DARK ? 0.1 : 0.09),
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.12) // capped at the 12% ceiling
            }
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.1) : theme.palette.grey[100],
          padding: '12px 16px',
          '&.MuiTableCell-head': {
            fontSize: '0.6875rem',
            color: theme.palette.grey[500],
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            backgroundColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.03) : theme.palette.grey[50]
          }
        }
      }
    },
    MuiDateTimePickerToolbar: {
      styleOverrides: {
        timeDigitsContainer: {
          alignItems: 'center'
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          margin: 0,
          lineHeight: 1.4,
          color: mode === ThemeMode.DARK ? theme.palette.background.paper : '#fff',
          background: mode === ThemeMode.DARK ? theme.palette.text.primary : theme.palette.grey[900]
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          letterSpacing: '-0.01em'
        }
      }
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          margin: '3px'
        }
      }
    },
    MuiDataGrid: {
      defaultProps: {
        rowHeight: 54
      },
      styleOverrides: {
        root: {
          borderWidth: 0,
          '& .MuiDataGrid-columnHeader--filledGroup': {
            borderBottomWidth: 0
          },
          '& .MuiDataGrid-columnHeader--emptyGroup': {
            borderBottomWidth: 0
          },
          '& .MuiFormControl-root>.MuiInputBase-root': {
            backgroundColor: `${theme.palette.background.default} !important`,
            borderColor:
              mode === ThemeMode.DARK ? `${alpha(theme.palette.divider, 0.05)} !important` : `${theme.palette.divider} !important`
          }
        },
        withBorderColor: {
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.divider, 0.15) : theme.palette.divider
        },
        toolbarContainer: {
          '& .MuiButton-root': {
            paddingLeft: '16px !important',
            paddingRight: '16px !important'
          }
        },
        columnHeader: {
          color: theme.palette.grey[600],
          paddingLeft: 24,
          paddingRight: 24
        },
        footerContainer: {
          '&.MuiDataGrid-withBorderColor': {
            borderBottom: 'none'
          }
        },
        columnHeaderCheckbox: {
          paddingLeft: 0,
          paddingRight: 0
        },
        cellCheckbox: {
          paddingLeft: 0,
          paddingRight: 0
        },
        cell: {
          borderWidth: 1,
          paddingLeft: 24,
          paddingRight: 24,
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.divider, 0.15) : theme.palette.divider,
          '&.MuiDataGrid-cell--withRenderer > div ': {
            ...(mode === ThemeMode.DARK && {
              color: theme.palette.grey[50]
            }),
            ' > .high': {
              background: mode === ThemeMode.DARK ? theme.palette.success.dark : theme.palette.success.light
            },
            '& > .medium': {
              background: mode === ThemeMode.DARK ? theme.palette.warning.dark : theme.palette.warning.light
            },
            '& > .low': {
              background: mode === ThemeMode.DARK ? theme.palette.error.dark : theme.palette.error.light
            }
          }
        }
      }
    },
    ...componentsOverrides(theme)
  };
}
