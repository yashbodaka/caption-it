import re

with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

new_root = '''/* Style System & Custom Design Tokens */
:root {
  --bg-base: #fffbf9;
  --bg-surface: #ffffff;
  --bg-surface-glass: rgba(255, 255, 255, 0.85);
  --border-color: rgba(243, 222, 215, 0.4);
  --border-focus: rgba(249, 158, 130, 0.6);
  
  --primary: #f99e82;
  --primary-glow: rgba(249, 158, 130, 0.25);
  --secondary: #fdbb9b;
  --secondary-glow: rgba(253, 187, 155, 0.25);
  
  --accent: #ffd8be;
  --danger: #e27d70;
  --success: #6ca092;
  --text-primary: #4a3834;
  --text-muted: #8e7a75;
  
  --font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --transition-fast: 0.15s ease;
  --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-glow: 0 8px 32px 0 rgba(235, 203, 192, 0.15);
  --shadow-neon: 0 0 15px var(--primary-glow);
}'''

# Replace the first instance of the root variable block
css = re.sub(r'/\* Style System & Custom Design Tokens \*/\s*:root \{.*?\n\}', new_root, css, flags=re.DOTALL)

# Find and remove monochrome
start_idx = css.find('/* Monochrome utility theme overrides */')
end_idx = css.find('/* Mobile Responsive Styling */')

if start_idx != -1 and end_idx != -1:
    css = css[:start_idx] + css[end_idx:]

with open('style.css', 'w', encoding='utf-8') as f:
    f.write(css)
print('Done!')