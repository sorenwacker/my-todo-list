# Security

## Content Security Policy

The application enforces a strict Content Security Policy to prevent XSS attacks and code injection.

### Current CSP Configuration

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' https://api.github.com https://github.com;
frame-src 'none';
object-src 'none';
base-uri 'self';
```

### CSP Directives Explained

- `script-src 'self' 'unsafe-inline'` - Only allows scripts from the app itself and inline scripts. Inline scripts are needed for Vue.js dynamic component rendering.
- `'unsafe-eval'` is **NOT** included, providing better security against code injection attacks.

### Dependencies and CSP Compatibility

All major dependencies work without `'unsafe-eval'`:

- **CodeMirror 6** - Modern architecture does not require eval
- **Mermaid** - Configured with `securityLevel: 'strict'` to prevent eval usage
- **Vue 3** - Runtime compiler not used, only precompiled templates
- **Marked** - Pure parser, no eval required

### Mermaid Security Configuration

Mermaid diagrams are rendered with strict security settings:

```javascript
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark', // or 'default' for light mode
  securityLevel: 'strict'
})
```

The `strict` security level prevents:
- JavaScript execution in diagram labels
- HTML content in labels
- Click events with JavaScript URLs

### Testing CSP Changes

To verify CSP compliance:

1. Start the app in development mode: `npm run dev`
2. Open DevTools Console
3. Look for CSP violation warnings (should be none)
4. Test all features:
   - CodeMirror editor (notes editing)
   - Mermaid diagrams in markdown
   - All Vue components and interactions

Any CSP violations will appear in the console as warnings with details about what was blocked.
