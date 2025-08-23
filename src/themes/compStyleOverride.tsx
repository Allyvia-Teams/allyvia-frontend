// material-ui
import { alpha, Theme } from '@mui/material/styles';

// project imports
import componentsOverrides from './overrides';
import { ThemeMode } from 'config';

export default function componentStyleOverrides(theme: Theme, borderRadius: number, outlinedFilled: boolean) {
  const mode = theme.palette.mode;
  const bgColor = mode === ThemeMode.DARK ? theme.palette.dark[800] : theme.palette.grey[50];
  const menuSelectedBack = mode === ThemeMode.DARK ? alpha(theme.palette.secondary.main, 0.15) : theme.palette.primary.light;
  const menuSelected = mode === ThemeMode.DARK ? theme.palette.secondary.main : theme.palette.primary.dark;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        ':root, body, #root': {
          overflowX: 'hidden',
          width: '100%',
          minWidth: 0
        },
        '*, *::before, *::after': {
          boxSizing: 'border-box'
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
          borderRadius: '4px',
          minHeight: 44,
          paddingLeft: 16,
          paddingRight: 16,
          '&:focus-visible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            outlineOffset: 2
          },
          ...theme.applyStyles('dark', {
            '&.MuiButton-colorWarning': { color: theme.palette.common.black }
          })
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          padding: 8,
          '&:focus-visible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            outlineOffset: 2
          }
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
          backgroundImage: 'none'
        },
        rounded: {
          borderRadius: `${borderRadius}px`
        }
      }
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          color: theme.palette.text.dark,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap'
        },
        title: {
          fontSize: '1.125rem'
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
          padding: '24px',
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
          paddingTop: '12px',
          paddingBottom: '12px',
          minHeight: 44,
          '& .MuiListItemIcon-root': {
            minWidth: 44
          },
          '&.Mui-selected': {
            color: menuSelected,
            backgroundColor: menuSelectedBack,
            '&:hover': {
              backgroundColor: menuSelectedBack
            },
            '& .MuiListItemIcon-root': {
              color: menuSelected
            }
          },
          '&:hover': {
            backgroundColor: menuSelectedBack,
            color: menuSelected,
            '& .MuiListItemIcon-root': {
              color: menuSelected
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
          borderRadius: `${borderRadius}px`,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.28) : theme.palette.grey[400]
          },
          '&:hover $notchedOutline': {
            borderColor: theme.palette.primary.light
          },
          '&.MuiInputBase-multiline': {
            padding: 1
          }
        },
        input: {
          fontWeight: 500,
          background: outlinedFilled ? bgColor : 'transparent',
          padding: '15.5px 14px',
          borderRadius: `${borderRadius}px`,
          '&.MuiInputBase-inputSizeSmall': {
            padding: '10px 14px',
            '&.MuiInputBase-inputAdornedStart': {
              paddingLeft: 0
            }
          }
        },
        inputAdornedStart: {
          paddingLeft: 4
        },
        notchedOutline: {
          borderRadius: `${borderRadius}px`
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
          color: mode === ThemeMode.DARK ? theme.palette.dark.main : theme.palette.primary.dark,
          background: mode === ThemeMode.DARK ? theme.palette.text.primary : theme.palette.primary[200]
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
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.2) : theme.palette.grey[200]
        },
        root: {
          minHeight: 48
        },
        scroller: {
          overflow: 'auto !important'
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
          lineHeight: 1.25
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          padding: '12px 0 12px 0'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: mode === ThemeMode.DARK ? alpha(theme.palette.text.primary, 0.15) : theme.palette.grey[200],
          '&.MuiTableCell-head': {
            fontSize: '0.875rem',
            color: mode === ThemeMode.DARK ? theme.palette.grey[600] : theme.palette.grey[900],
            fontWeight: 500
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
          color: theme.palette.background.paper,
          background: theme.palette.text.primary
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.25rem'
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
