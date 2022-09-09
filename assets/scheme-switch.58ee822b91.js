class SchemeSwitch extends HTMLElement{connectedCallback(){const e=document.querySelector("#scheme-switch");if(!e)return;this.classList.add("no-print"),this.attachShadow({mode:"open"}).append(e.content.cloneNode(!0)),this.light=document.querySelector("link[media*=light]"),this.dark=document.querySelector("link[media*=dark]"),this.label=this.shadowRoot.querySelector("span");const t=SchemeSwitch.getScheme();if(t){this.toggle(t);const o=this.shadowRoot.querySelector(`input[value=${t}]`);o&&(o.checked=!0)}const l=this.shadowRoot.querySelectorAll("input");for(const o of l)o.addEventListener("change",i=>{i.target&&this.toggle(i.target.value)})}toggle(e){if(!(this.light&&this.dark&&this.label))throw new Error("Media elements not found");switch(e){case"light":{this.dark.media="not all",this.light.media="all",this.label.innerHTML="System Mode",SchemeSwitch.setScheme(e);break}case"dark":{this.dark.media="all",this.light.media="not all",this.label.innerHTML="Light Mode",SchemeSwitch.setScheme(e);break}default:{this.dark.media="(prefers-color-scheme: dark)",this.light.media="(prefers-color-scheme: light)",this.label.innerHTML="Dark Mode",SchemeSwitch.removeScheme();break}}}disconnectedCallback(){const e=this.shadowRoot.querySelectorAll("input");for(const t of e)t.removeEventListener("change")}static getScheme(){return window.localStorage.getItem("colorScheme")}static setScheme(e){window.localStorage.setItem("colorScheme",e)}static removeScheme(){window.localStorage.removeItem("colorScheme")}}matchMedia("(prefers-color-scheme: dark)").media==="not all"&&(document.documentElement.style.display="none",document.head.insertAdjacentHTML("beforeend",`<linkhref="/light.css"onload="document.documentElement.style.display=''"rel="stylesheet">`)),window.customElements.get("scheme-switch")||window.customElements.define("scheme-switch",SchemeSwitch);