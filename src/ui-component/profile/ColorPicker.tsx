import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Popover, Stack, TextField, Typography, Slider, Grid, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

// Helper functions to convert between color formats
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

export default function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [colorInput, setColorInput] = useState(value || '#000000');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hue, setHue] = useState(0);
  const [rgb, setRgb] = useState({ r: 0, g: 0, b: 0 });
  const [hsl, setHsl] = useState({ h: 0, s: 100, l: 50 });

  const open = Boolean(anchorEl);

  // Initialize color from value prop when popover opens
  useEffect(() => {
    if (open && value) {
      const rgbValue = hexToRgb(value);
      if (rgbValue) {
        const hslValue = rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b);
        setColorInput(value);
        setRgb(rgbValue);
        setHsl(hslValue);
        setHue(hslValue.h);
      }
    }
  }, [open]); // Initialize when popover opens

  // Also update when value prop changes externally (when popover is closed)
  useEffect(() => {
    if (!open && value) {
      const rgbValue = hexToRgb(value);
      if (rgbValue) {
        const hslValue = rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b);
        setColorInput(value);
        setRgb(rgbValue);
        setHsl(hslValue);
        setHue(hslValue.h);
      }
    }
  }, [value, open]);

  // Update color when HSL changes (called by user interactions)
  const updateColorFromHsl = useCallback(
    (newHsl: { h: number; s: number; l: number }) => {
      const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
      const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      setRgb(newRgb);
      setHsl(newHsl);
      setColorInput(hex);
      onChange(hex);
    },
    [onChange]
  );

  // Draw color canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Use ImageData for better performance
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // Draw gradient: X-axis = saturation (0-100%), Y-axis = lightness (100%-0%)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = (x / width) * 100;
        const l = 100 - (y / height) * 100;
        const rgb = hslToRgb(hue, s, l);
        const index = (y * width + x) * 4;
        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [hue]);

  const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const width = rect.width;
      const height = rect.height;

      // Clamp values to canvas bounds
      const clampedX = Math.max(0, Math.min(width, x));
      const clampedY = Math.max(0, Math.min(height, y));

      const s = Math.max(0, Math.min(100, (clampedX / width) * 100));
      const l = Math.max(0, Math.min(100, 100 - (clampedY / height) * 100));

      updateColorFromHsl({ h: hue, s, l });
    },
    [hue, updateColorFromHsl]
  );

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleCanvasClick(e);
  };

  const handleHexChange = (newValue: string) => {
    setColorInput(newValue);
    // Only update if valid hex color (6 digits)
    if (/^#([A-Fa-f0-9]{6})$/.test(newValue)) {
      const rgbValue = hexToRgb(newValue);
      if (rgbValue) {
        const hslValue = rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b);
        setRgb(rgbValue);
        setHue(hslValue.h);
        setHsl(hslValue);
        onChange(newValue);
      }
    }
  };

  const handleRgbChange = (component: 'r' | 'g' | 'b', newValue: number) => {
    const clampedValue = Math.max(0, Math.min(255, newValue));
    const newRgb = { ...rgb, [component]: clampedValue };
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    const hslValue = rgbToHsl(newRgb.r, newRgb.g, newRgb.b);
    setRgb(newRgb);
    setHue(hslValue.h);
    setHsl(hslValue);
    setColorInput(hex);
    onChange(hex);
  };

  const handleHueChange = (_: Event, newValue: number | number[]) => {
    const newHue = Array.isArray(newValue) ? newValue[0] : newValue;
    const newHsl = { ...hsl, h: newHue };
    setHue(newHue);
    updateColorFromHsl(newHsl);
  };

  // Calculate picker position based on current HSL (percentage)
  const pickerXPercent = hsl.s;
  const pickerYPercent = 100 - hsl.l;

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="body2" fontWeight={500}>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" title={description}>
            (i)
          </Typography>
        )}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          onClick={handleOpen}
          sx={{
            width: 60,
            height: 40,
            backgroundColor: colorInput || '#ffffff',
            border: '2px solid',
            borderColor: open ? 'primary.main' : 'divider',
            borderRadius: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            '&:hover': {
              borderColor: 'primary.main',
              opacity: 0.9
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              padding: '2px',
              background: `linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.1) 50%, transparent 70%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }
          }}
        />
        <TextField
          size="small"
          value={colorInput}
          onChange={(e) => handleHexChange(e.target.value)}
          placeholder="#000000"
          sx={{ flex: 1, minWidth: 100 }}
          inputProps={{
            pattern: '^#([A-Fa-f0-9]{6})$',
            maxLength: 7
          }}
        />
      </Stack>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left'
        }}
        PaperProps={{
          sx: {
            p: 2,
            minWidth: 600,
            maxWidth: 700
          }
        }}
      >
        <Grid container spacing={2}>
          {/* Left Side - Color Canvas and Hue Slider */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={2}>
              {/* Color Canvas */}
              <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: theme.shape.borderRadius,
                    border: `1px solid ${theme.palette.divider}`,
                    overflow: 'hidden',
                    cursor: 'crosshair'
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={200}
                    height={200}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block'
                    }}
                    onMouseDown={(e) => {
                      setIsDragging(true);
                      handleCanvasClick(e);
                    }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                  />
                  {/* Picker indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${pickerXPercent}%`,
                      top: `${pickerYPercent}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2px solid white',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}
                  />
                </Box>
              </Box>

              {/* Hue Slider */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Hue
                </Typography>
                <Box
                  sx={{
                    height: 24,
                    borderRadius: 1,
                    background: `linear-gradient(to right, 
                      #ff0000 0%, 
                      #ffff00 17%, 
                      #00ff00 33%, 
                      #00ffff 50%, 
                      #0000ff 67%, 
                      #ff00ff 83%, 
                      #ff0000 100%)`,
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  <Slider
                    value={hue}
                    min={0}
                    max={360}
                    onChange={handleHueChange}
                    sx={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      padding: 0,
                      '& .MuiSlider-thumb': {
                        width: 20,
                        height: 20,
                        backgroundColor: 'white',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      },
                      '& .MuiSlider-track': {
                        display: 'none'
                      },
                      '& .MuiSlider-rail': {
                        display: 'none'
                      }
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          </Grid>

          {/* Right Side - RGB Controls, Hex Input, Preset Colors */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack spacing={2}>
              {/* Hex Input */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Hex Color
                </Typography>
                <TextField
                  size="small"
                  value={colorInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  fullWidth
                  inputProps={{
                    pattern: '^#([A-Fa-f0-9]{6})$',
                    maxLength: 7
                  }}
                />
              </Box>

              {/* RGB Sliders */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  RGB Values
                </Typography>
                <Stack spacing={1.5}>
                  {/* Red */}
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', minWidth: 50 }}>
                        Red
                      </Typography>
                      <Slider
                        size="small"
                        value={rgb.r}
                        min={0}
                        max={255}
                        onChange={(_, val) => handleRgbChange('r', val as number)}
                        sx={{
                          flex: 1,
                          '& .MuiSlider-thumb': {
                            backgroundColor: '#f44336',
                            width: 16,
                            height: 16
                          },
                          '& .MuiSlider-track': {
                            backgroundColor: '#f44336',
                            height: 4
                          },
                          '& .MuiSlider-rail': {
                            height: 4
                          }
                        }}
                      />
                      <TextField
                        size="small"
                        value={rgb.r}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                          handleRgbChange('r', val);
                        }}
                        inputProps={{
                          min: 0,
                          max: 255,
                          type: 'number',
                          style: { fontSize: '0.75rem', padding: '4px 8px', textAlign: 'center', width: 50 }
                        }}
                        sx={{ width: 60, '& .MuiInputBase-root': { height: 32 } }}
                      />
                    </Stack>
                  </Box>

                  {/* Green */}
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', minWidth: 50 }}>
                        Green
                      </Typography>
                      <Slider
                        size="small"
                        value={rgb.g}
                        min={0}
                        max={255}
                        onChange={(_, val) => handleRgbChange('g', val as number)}
                        sx={{
                          flex: 1,
                          '& .MuiSlider-thumb': {
                            backgroundColor: '#4caf50',
                            width: 16,
                            height: 16
                          },
                          '& .MuiSlider-track': {
                            backgroundColor: '#4caf50',
                            height: 4
                          },
                          '& .MuiSlider-rail': {
                            height: 4
                          }
                        }}
                      />
                      <TextField
                        size="small"
                        value={rgb.g}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                          handleRgbChange('g', val);
                        }}
                        inputProps={{
                          min: 0,
                          max: 255,
                          type: 'number',
                          style: { fontSize: '0.75rem', padding: '4px 8px', textAlign: 'center', width: 50 }
                        }}
                        sx={{ width: 60, '& .MuiInputBase-root': { height: 32 } }}
                      />
                    </Stack>
                  </Box>

                  {/* Blue */}
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', minWidth: 50 }}>
                        Blue
                      </Typography>
                      <Slider
                        size="small"
                        value={rgb.b}
                        min={0}
                        max={255}
                        onChange={(_, val) => handleRgbChange('b', val as number)}
                        sx={{
                          flex: 1,
                          '& .MuiSlider-thumb': {
                            backgroundColor: '#2196f3',
                            width: 16,
                            height: 16
                          },
                          '& .MuiSlider-track': {
                            backgroundColor: '#2196f3',
                            height: 4
                          },
                          '& .MuiSlider-rail': {
                            height: 4
                          }
                        }}
                      />
                      <TextField
                        size="small"
                        value={rgb.b}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(255, parseInt(e.target.value) || 0));
                          handleRgbChange('b', val);
                        }}
                        inputProps={{
                          min: 0,
                          max: 255,
                          type: 'number',
                          style: { fontSize: '0.75rem', padding: '4px 8px', textAlign: 'center', width: 50 }
                        }}
                        sx={{ width: 60, '& .MuiInputBase-root': { height: 32 } }}
                      />
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              {/* Actions */}
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={handleClose} variant="outlined">
                  Close
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Popover>
    </Box>
  );
}
