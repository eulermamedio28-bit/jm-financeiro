// Appearance preference only; no financial data or credentials are stored here.
export function installAppearance(container){
 const key='elm_theme_v1',allowed=['light','dark','auto'],system=matchMedia('(prefers-color-scheme: dark)');let preference='light';
 try{const saved=localStorage.getItem(key);if(allowed.includes(saved))preference=saved;}catch{}
 const panel=document.createElement('section');panel.className='panel';panel.id='elm-appearance';panel.hidden=true;
 panel.innerHTML='<h2>Aparência</h2><p class="sub">Escolha como prefere visualizar o aplicativo.</p><fieldset class="elm-theme-options"><legend>Tema do aplicativo</legend><label><input type="radio" name="elm-theme" value="light">Claro</label><label><input type="radio" name="elm-theme" value="dark">Escuro</label><label><input type="radio" name="elm-theme" value="auto">Automático · acompanhar o celular</label></fieldset><p class="sub" id="elm-theme-feedback"></p>';
 container.append(panel);
 function apply(){const effective=preference==='auto'?(system.matches?'dark':'light'):preference;document.documentElement.dataset.theme=effective;document.documentElement.dataset.themePreference=preference;document.documentElement.style.colorScheme=effective;const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=effective==='light'?'#f7f5f6':'#180f14';for(const input of panel.querySelectorAll('input'))input.checked=input.value===preference;}
 panel.addEventListener('change',e=>{if(!allowed.includes(e.target.value))return;preference=e.target.value;apply();try{localStorage.setItem(key,preference);document.getElementById('elm-theme-feedback').textContent='Preferência salva neste aparelho.';}catch{document.getElementById('elm-theme-feedback').textContent='Tema aplicado nesta sessão.';}});
 system.addEventListener('change',()=>{if(preference==='auto')apply();});apply();
 return ()=>{panel.hidden=!panel.hidden;};
}
