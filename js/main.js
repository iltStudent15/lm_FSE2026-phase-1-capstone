document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
	anchor.addEventListener('click', function (e) {
		var hrefValue = this.getAttribute('href');
		if (!hrefValue || hrefValue === '#') {
			return;
		}

		var target = document.querySelector(hrefValue);
		if (target) {
			e.preventDefault();
			target.scrollIntoView({ behavior: 'smooth' });
		}
	});
});

var currentPage = window.location.pathname.split('/').pop() || 'index.html';

document.querySelectorAll('.navbar .nav-link').forEach(function (link) {
	var linkHref = link.getAttribute('href');
	if (!linkHref) {
		return;
	}

	var linkPage = linkHref.split('/').pop();
	var isActive = linkPage === currentPage;

	link.classList.toggle('active', isActive);
	if (isActive) {
		link.setAttribute('aria-current', 'page');
	} else {
		link.removeAttribute('aria-current');
	}
});
