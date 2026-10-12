// Apply the saved theme before loading styles to avoid a light flash.
(() => {
    let theme = 'light';
    try { if (localStorage.getItem('studio_theme') === 'dark') theme = 'dark'; } catch {}
    document.documentElement.setAttribute('data-theme', theme);
})();
