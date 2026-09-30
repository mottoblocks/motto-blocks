document.addEventListener('DOMContentLoaded', () => {
  const classicMenuApi = window.mottoBlocksClassicMenu;

  if (!classicMenuApi || typeof classicMenuApi.initClassicMenus !== 'function') {
    return;
  }

  classicMenuApi.initClassicMenus(document);
});
