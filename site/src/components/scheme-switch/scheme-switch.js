class SchemeSwitch extends HTMLElement {
  connectedCallback() {
    const template = document.querySelector('#scheme-switch');
    if (!template) return;
    this.classList.add('no-print');
    this.attachShadow({ mode: 'open' })
      .append(template.content.cloneNode(true));

    this.light = document.querySelector('link[media*=light]');
    this.dark = document.querySelector('link[media*=dark]');
    this.label = this.shadowRoot.querySelector('span');

    const scheme = SchemeSwitch.getScheme();
    if (scheme) {
      this.toggle(scheme);
      const option = this.shadowRoot.querySelector(`input[value=${scheme}]`);
      if (option) option.checked = true;
    }

    const options = this.shadowRoot.querySelectorAll('input');
    for (const option of options) {
      option.addEventListener('change', (event) => {
        if (event.target) this.toggle(event.target.value);
      });
    }
  }

  toggle(scheme) {
    if (!(this.light && this.dark && this.label)) {
      throw new Error('Media elements not found');
    }
    switch (scheme) {
      case 'light': {
        this.dark.media = 'not all';
        this.light.media = 'all';
        this.label.innerHTML = 'System Mode';
        SchemeSwitch.setScheme(scheme);
        break;
      }
      case 'dark': {
        this.dark.media = 'all';
        this.light.media = 'not all';
        this.label.innerHTML = 'Light Mode';
        SchemeSwitch.setScheme(scheme);
        break;
      }
      default: {
        this.dark.media = '(prefers-color-scheme: dark)';
        this.light.media = '(prefers-color-scheme: light)';
        this.label.innerHTML = 'Dark Mode';
        SchemeSwitch.removeScheme();
        break;
      }
    }
  }

  disconnectedCallback() {
    const options = this.shadowRoot.querySelectorAll('input');
    for (const option of options) option.removeEventListener('change');
  }

  static getScheme() {
    return window.localStorage.getItem('colorScheme');
  }

  static setScheme(scheme) {
    window.localStorage.setItem('colorScheme', scheme);
  }

  static removeScheme() {
    window.localStorage.removeItem('colorScheme');
  }
}

if (matchMedia('(prefers-color-scheme: dark)').media === 'not all') {
  document.documentElement.style.display = 'none';
  document.head.insertAdjacentHTML(
    'beforeend',
    '<link'
      + 'href="/light.css"'
      + 'onload="document.documentElement.style.display=\'\'"'
      + 'rel="stylesheet"'
      + '>',
  );
}

if (!window.customElements.get('scheme-switch')) {
  window.customElements.define('scheme-switch', SchemeSwitch);
}
