document.addEventListener('DOMContentLoaded', function () {
  const toggleButton = document.getElementById('toggleSidebar');
  const sidebar = document.getElementById('sidebar');
  const container = document.querySelector('.container');

  if (toggleButton && sidebar && container) {
    toggleButton.addEventListener('click', () => {
      sidebar.classList.toggle('minimized');
      if (sidebar.classList.contains('minimized')) {
        container.style.marginLeft = '60px';
      } else {
        container.style.marginLeft = '250px';
      }
    });
  }
});
