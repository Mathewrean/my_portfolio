document.addEventListener('DOMContentLoaded', () => {
  // Tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Show the corresponding pane
      const tabId = button.getAttribute('data-tab');
      const tabPane = document.getElementById(tabId);
      tabPane.classList.add('active');
    });
  });

  // Vertical slider functionality for each tab - now scrollable
  const sliders = document.querySelectorAll('.vertical-slider');
  
  sliders.forEach(slider => {
    const slides = slider.querySelectorAll('.challenge-slide');
    
    // Show all slides for vertical scrolling
    slides.forEach(slide => {
      slide.style.display = 'block';
    });
    
    // Hide navigation buttons since scrolling is manual
    const prevBtn = slider.querySelector('.prev-slide');
    const nextBtn = slider.querySelector('.next-slide');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
  });
});
