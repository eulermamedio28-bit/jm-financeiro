// Gate for the development build. The financial app initializer is never invoked
// until an authenticated identity is returned. This is NOT a server access control.
export function criarPortaoDeAcesso({autenticar,inicializarPainel,encerrarPainel}){
 if(typeof autenticar!=='function'||typeof inicializarPainel!=='function'||typeof encerrarPainel!=='function')throw Error('Dependências obrigatórias');
 let state='locked',generation=0;
 return Object.freeze({
  get status(){return state},
  async entrar(email,senha){
   if(state!=='locked')throw Error('Estado de autenticação inválido');
   state='authenticating';const attempt=++generation;
   try{
    const identity=await autenticar(email,senha);
    if(attempt!==generation)return false;
    if(!identity||typeof identity.userId!=='string'||!identity.userId)throw Error('Identidade inválida');
    state='initializing';
    await inicializarPainel(identity);
    if(attempt!==generation){await encerrarPainel();return false}
    state='unlocked';return true;
   }catch(e){if(attempt===generation){state='locked';await encerrarPainel()}throw e}
  },
  async bloquear(){
   ++generation;state='locked';await encerrarPainel();
  }
 });
}
