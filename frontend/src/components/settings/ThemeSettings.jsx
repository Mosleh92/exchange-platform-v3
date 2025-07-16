import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../UI/Card';
import { Button } from '../UI/Button';
import { Switch } from '../UI/Switch';
import { Select } from '../UI/Select';
import { Slider } from '../UI/Slider';
import { Badge } from '../UI/Badge';
import { Moon, Sun, Palette, Eye, EyeOff } from 'lucide-react';

const ThemeSettings = () => {
  const [theme, setTheme] = useState('light');
  const [accentColor, setAccentColor] = useState('blue');
  const [fontSize, setFontSize] = useState(14);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [autoTheme, setAutoTheme] = useState(true);
  const [saved, setSaved] = useState(false);

  const accentColors = [
    { name: 'Blue', value: 'blue', hex: '#3B82F6' },
    { name: 'Green', value: 'green', hex: '#10B981' },
    { name: 'Purple', value: 'purple', hex: '#8B5CF6' },
    { name: 'Red', value: 'red', hex: '#EF4444' },
    { name: 'Orange', value: 'orange', hex: '#F59E0B' },
    { name: 'Pink', value: 'pink', hex: '#EC4899' },
    { name: 'Indigo', value: 'indigo', hex: '#6366F1' },
    { name: 'Teal', value: 'teal', hex: '#14B8A6' }
  ];

  const fontSizes = [
    { name: 'Small', value: 12 },
    { name: 'Medium', value: 14 },
    { name: 'Large', value: 16 },
    { name: 'Extra Large', value: 18 }
  ];

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedAccentColor = localStorage.getItem('accentColor') || 'blue';
    const savedFontSize = parseInt(localStorage.getItem('fontSize')) || 14;
    const savedReducedMotion = localStorage.getItem('reducedMotion') === 'true';
    const savedHighContrast = localStorage.getItem('highContrast') === 'true';
    const savedAutoTheme = localStorage.getItem('autoTheme') !== 'false';

    setTheme(savedTheme);
    setAccentColor(savedAccentColor);
    setFontSize(savedFontSize);
    setReducedMotion(savedReducedMotion);
    setHighContrast(savedHighContrast);
    setAutoTheme(savedAutoTheme);

    applyTheme(savedTheme);
    applyAccentColor(savedAccentColor);
    applyFontSize(savedFontSize);
    applyReducedMotion(savedReducedMotion);
    applyHighContrast(savedHighContrast);
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', newTheme === 'dark' ? '#1F2937' : '#FFFFFF');
    }
  };

  const applyAccentColor = (color) => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', accentColors.find(c => c.value === color)?.hex || '#3B82F6');
  };

  const applyFontSize = (size) => {
    const root = document.documentElement;
    root.style.setProperty('--font-size-base', `${size}px`);
  };

  const applyReducedMotion = (enabled) => {
    const root = document.documentElement;
    if (enabled) {
      root.style.setProperty('--motion-reduce', 'reduce');
    } else {
      root.style.removeProperty('--motion-reduce');
    }
  };

  const applyHighContrast = (enabled) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAccentColorChange = (color) => {
    setAccentColor(color);
    applyAccentColor(color);
    localStorage.setItem('accentColor', color);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    applyFontSize(size);
    localStorage.setItem('fontSize', size.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReducedMotionChange = (enabled) => {
    setReducedMotion(enabled);
    applyReducedMotion(enabled);
    localStorage.setItem('reducedMotion', enabled.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleHighContrastChange = (enabled) => {
    setHighContrast(enabled);
    applyHighContrast(enabled);
    localStorage.setItem('highContrast', enabled.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAutoThemeChange = (enabled) => {
    setAutoTheme(enabled);
    localStorage.setItem('autoTheme', enabled.toString());
    
    if (enabled) {
      // Check system preference
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      handleThemeChange(systemTheme);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetToDefaults = () => {
    handleThemeChange('light');
    handleAccentColorChange('blue');
    handleFontSizeChange(14);
    handleReducedMotionChange(false);
    handleHighContrastChange(false);
    handleAutoThemeChange(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Theme Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Customize your trading platform appearance</p>
        </div>
        {saved && (
          <Badge variant="success" className="flex items-center space-x-2">
            <span>✓</span>
            <span>Settings saved</span>
          </Badge>
        )}
      </div>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Theme</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto Theme */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Auto Theme</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically switch theme based on system preference
              </p>
            </div>
            <Switch
              checked={autoTheme}
              onCheckedChange={handleAutoThemeChange}
            />
          </div>

          {/* Manual Theme Selection */}
          {!autoTheme && (
            <div className="space-y-4">
              <h3 className="font-medium">Manual Theme</h3>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('light')}
                  className="flex items-center space-x-2"
                >
                  <Sun className="w-4 h-4" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  onClick={() => handleThemeChange('dark')}
                  className="flex items-center space-x-2"
                >
                  <Moon className="w-4 h-4" />
                  <span>Dark</span>
                </Button>
              </div>
            </div>
          )}

          {/* Theme Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium mb-2">Preview</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 bg-blue-500 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-green-500 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-red-500 rounded"></div>
                <div className="h-4 bg-yellow-500 rounded"></div>
                <div className="h-4 bg-purple-500 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle>Accent Color</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {accentColors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleAccentColorChange(color.value)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  accentColor === color.value
                    ? 'border-gray-900 dark:border-white'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div
                  className="w-full h-8 rounded"
                  style={{ backgroundColor: color.hex }}
                ></div>
                <span className="block text-sm font-medium mt-2">{color.name}</span>
                {accentColor === color.value && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Font Size */}
      <Card>
        <CardHeader>
          <CardTitle>Font Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Size</span>
              <span className="font-medium">{fontSizes.find(f => f.value === fontSize)?.name}</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => handleFontSizeChange(value[0])}
              min={12}
              max={18}
              step={2}
              className="w-full"
            />
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <p style={{ fontSize: `${fontSize}px` }}>
                This is how your text will appear with the selected font size.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility */}
      <Card>
        <CardHeader>
          <CardTitle>Accessibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Reduced Motion */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Reduced Motion</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reduce animations and transitions
              </p>
            </div>
            <Switch
              checked={reducedMotion}
              onCheckedChange={handleReducedMotionChange}
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">High Contrast</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Increase contrast for better visibility
              </p>
            </div>
            <Switch
              checked={highContrast}
              onCheckedChange={handleHighContrastChange}
            />
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium mb-2">Accessibility Preview</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Normal contrast</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-700 rounded"></div>
                <span>High contrast</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Defaults
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline">
            Export Settings
          </Button>
          <Button>
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeSettings; 