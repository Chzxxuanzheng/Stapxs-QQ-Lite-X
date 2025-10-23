import{e as r,r as l,m as p}from"./@vue-Jbi4Gnt3.js";/*!
 * pinia v3.0.3
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */const u=Symbol();var o;(function(t){t.direct="direct",t.patchObject="patch object",t.patchFunction="patch function"})(o||(o={}));function h(){const t=r(!0),s=t.run(()=>l({}));let a=[],n=[];const c=p({install(e){c._a=e,e.provide(u,c),e.config.globalProperties.$pinia=c,n.forEach(i=>a.push(i)),n=[]},use(e){return this._a?a.push(e):n.push(e),this},_p:a,_a:null,_e:t,_s:new Map,state:s});return c}export{h as c};
