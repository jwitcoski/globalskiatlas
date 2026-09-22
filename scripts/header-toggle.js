/**
 * Responsive header collapse for mobile (used on mainmap, roadtripskimap, etc.)
 */
(function () {
  var RESPONSIVE_WIDTH = 1024;
  var isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;
  var collapseBtn = document.getElementById('collapse-btn');
  var collapseHeaderItems = document.getElementById('collapsed-header-items');
  function onHeaderClickOutside(e) {
    if (collapseHeaderItems && !collapseHeaderItems.contains(e.target) && !collapseBtn.contains(e.target)) {
      toggleHeader();
    }
  }
  function setExpanded(open) {
    if (collapseBtn) collapseBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function toggleHeader() {
    if (!collapseHeaderItems || !collapseBtn) return;
    if (isHeaderCollapsed) {
      collapseHeaderItems.classList.add('opacity-100');
      collapseHeaderItems.style.width = '60vw';
      collapseBtn.classList.remove('bi-list');
      collapseBtn.classList.add('bi-x', 'max-lg:tw-fixed');
      isHeaderCollapsed = false;
      setExpanded(true);
      setTimeout(function () { window.addEventListener('click', onHeaderClickOutside); }, 1);
    } else {
      collapseHeaderItems.classList.remove('opacity-100');
      collapseHeaderItems.style.width = '0vw';
      collapseBtn.classList.remove('bi-x', 'max-lg:tw-fixed');
      collapseBtn.classList.add('bi-list');
      isHeaderCollapsed = true;
      setExpanded(false);
      window.removeEventListener('click', onHeaderClickOutside);
    }
  }
  function responsive() {
    if (window.innerWidth >= RESPONSIVE_WIDTH && collapseHeaderItems) {
      collapseHeaderItems.style.width = '';
    } else {
      isHeaderCollapsed = true;
    }
  }
  window.toggleHeader = toggleHeader;
  if (collapseBtn) {
    collapseBtn.setAttribute('aria-expanded', 'false');
    collapseBtn.setAttribute('aria-controls', 'collapsed-header-items');
  }
  window.addEventListener('resize', responsive);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.header-dropdown-group.is-open').forEach(function (g) {
      g.classList.remove('is-open');
    });
    if (!isHeaderCollapsed) toggleHeader();
  });
})();
