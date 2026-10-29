const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const prompts={
  bag:'Create a Minecraft-style brown leather backpack with two gold buckles, shoulder straps, a carry handle, and a front pocket. Keep the parts editable.',
  staff:'Create a Minecraft-style wizard staff with a wooden shaft, wrapped grip, gold fittings, and a large violet crystal. Keep the parts editable.',
  robot:'Use VoxelFlow to create a slender blue and gold Atlas robot with bright cyan eyes. Add editable idle, walk, and attack animations.'
};
let toastTimer;
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3200);}
async function copy(text){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);}else{const field=document.createElement('textarea');field.value=text;field.style.cssText='position:fixed;left:-9999px';document.body.append(field);field.select();const success=document.execCommand('copy');field.remove();if(!success)throw Error('Clipboard unavailable');}toast('Copied. Make it yours.');}catch{window.prompt('Copy this text:',text);}}
$$('[data-copy-prompt]').forEach(button=>button.addEventListener('click',()=>copy(prompts[button.dataset.copyPrompt])));
$$('[data-copy-text]').forEach(button=>button.addEventListener('click',()=>copy(button.dataset.copyText)));
$$('[data-copy-code]').forEach(button=>button.addEventListener('click',()=>copy($('code',button.closest('.code-block')).textContent.trim())));
const menu=$('.menu-toggle'),nav=$('#navigation');
function closeMenu(){nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false');menu?.setAttribute('aria-label','Open navigation');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
$$('a',nav||document.createElement('div')).forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
const capture=$('#capture-dialog');
$('#expand-capture')?.addEventListener('click',()=>capture.showModal());
$('[data-close-dialog]')?.addEventListener('click',()=>capture.close());
capture?.addEventListener('click',event=>{if(event.target===capture){const r=capture.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)capture.close();}});
$('#print-guide')?.addEventListener('click',()=>window.print());

// Small, dependency-free renderer of the actual project sample cube blueprints.
// This is a model viewer; it never calls an AI endpoint or edits Blockbench.
const DEG=Math.PI/180;
function rotate(point,angles){let [x,y,z]=point;let [a,b,c]=angles;let t=y*Math.cos(a)-z*Math.sin(a);z=y*Math.sin(a)+z*Math.cos(a);y=t;t=x*Math.cos(b)+z*Math.sin(b);z=-x*Math.sin(b)+z*Math.cos(b);x=t;t=x*Math.cos(c)-y*Math.sin(c);y=x*Math.sin(c)+y*Math.cos(c);x=t;return[x,y,z];}
function rgb(hex,factor){return'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*factor))).toString(16).padStart(2,'0')).join('');}
const FACE_DEFS=[{ids:[0,1,2,3],normal:[0,0,-1],shade:1.02},{ids:[4,7,6,5],normal:[0,0,1],shade:.82},{ids:[0,4,5,1],normal:[0,-1,0],shade:.61},{ids:[3,2,6,7],normal:[0,1,0],shade:1.17},{ids:[1,5,6,2],normal:[1,0,0],shade:.87},{ids:[0,3,7,4],normal:[-1,0,0],shade:.77}];
class ModelViewer{
  constructor(canvas,model,{interactive=false,kind='bag',grid=false}={}){this.canvas=canvas;this.context=canvas.getContext('2d');if(!this.context)throw Error('Canvas not supported');this.kind=kind;this.grid=grid;this.model=model;this.yaw=-.57;this.pitch=.24;this.roll=kind==='staff'?-.23:0;this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(canvas);if(interactive)this.bind();this.draw();}
  setModel(model,kind){this.model=model;this.kind=kind;this.roll=kind==='staff'?-.23:0;this.yaw=-.57;this.pitch=.24;this.draw();}
  reset(){this.yaw=-.57;this.pitch=.24;this.draw();}
  bind(){let drag=null;this.canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};this.canvas.setPointerCapture(e.pointerId);});this.canvas.addEventListener('pointermove',e=>{if(!drag)return;this.yaw+=(e.clientX-drag.x)*.012;this.pitch=Math.max(-.15,Math.min(.75,this.pitch+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};this.draw();});for(const name of ['pointerup','pointercancel','lostpointercapture'])this.canvas.addEventListener(name,()=>{drag=null;});this.canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')return this.reset();if(e.key==='ArrowLeft')this.yaw-=.15;if(e.key==='ArrowRight')this.yaw+=.15;if(e.key==='ArrowUp')this.pitch=Math.min(.75,this.pitch+.08);if(e.key==='ArrowDown')this.pitch=Math.max(-.15,this.pitch-.08);this.draw();});}
  draw(){const canvas=this.canvas,ctx=this.context,r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(window.devicePixelRatio||1,2),w=r.width,h=r.height;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const model=this.model;if(!model?.parts?.length)return;
    const materials=Object.fromEntries(model.materials.map(m=>[m.name,m.color]));const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    const parts=model.parts.map(part=>{const [x0,y0,z0]=part.from,[x1,y1,z1]=part.to;const pivot=part.pivot||part.origin||[0,0,0],angles=(part.rotation||[0,0,0]).map(n=>n*DEG);const vertices=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].map(p=>{const q=rotate(p.map((n,i)=>n-pivot[i]),angles).map((n,i)=>n+pivot[i]);q.forEach((n,i)=>{min[i]=Math.min(min[i],n);max[i]=Math.max(max[i],n);});return q;});return{vertices,angles,color:materials[part.material]||'#8997a9'};});
    const center=min.map((n,i)=>(n+max[i])/2),height=max[1]-min[1],breadth=Math.hypot(max[0]-min[0],max[2]-min[2]);const scale=Math.min(w/(breadth*1.5),h/(height*1.36));const view=p=>{const [x,y,z]=rotate(p,[0,this.yaw,0]);let a=y*Math.cos(this.pitch)+z*Math.sin(this.pitch),depth=z*Math.cos(this.pitch)-y*Math.sin(this.pitch);return[x*Math.cos(this.roll)-a*Math.sin(this.roll),x*Math.sin(this.roll)+a*Math.cos(this.roll),depth];};const project=p=>[w/2+p[0]*scale,h*.48-p[1]*scale,p[2]];
    if(this.grid){const groundY=min[1]-center[1]-.5,extent=Math.max(height*.64,breadth*.75),step=extent/5;ctx.lineWidth=.6;ctx.strokeStyle='#a5bbd735';for(let n=-5;n<=5;n++){for(const orientation of [0,1]){const a=orientation?[-extent,groundY,n*step]:[n*step,groundY,-extent];const b=orientation?[extent,groundY,n*step]:[n*step,groundY,extent];const u=project(view(a)),v=project(view(b));ctx.beginPath();ctx.moveTo(u[0],u[1]);ctx.lineTo(v[0],v[1]);ctx.stroke();}}}
    const ground=project(view([0,min[1]-center[1]-.4,0]));ctx.save();ctx.translate(ground[0],ground[1]);ctx.scale(1,.24);const shadow=ctx.createRadialGradient(0,0,0,0,0,Math.max(12,breadth*scale*.58));shadow.addColorStop(0,'#00000075');shadow.addColorStop(1,'#00000000');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,Math.max(12,breadth*scale*.58),0,Math.PI*2);ctx.fill();ctx.restore();
    const faces=[];for(const part of parts){const v=part.vertices.map(p=>view(p.map((n,i)=>n-center[i])));for(const face of FACE_DEFS){const normal=view(rotate(face.normal,part.angles));if(normal[2]>=-.001)continue;const points=face.ids.map(i=>project(v[i]));faces.push({points,depth:points.reduce((sum,p)=>sum+p[2],0)/4,color:rgb(part.color,face.shade)});}}faces.sort((a,b)=>b.depth-a.depth);ctx.lineJoin='round';for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fillStyle=face.color;ctx.fill();ctx.strokeStyle=rgb(face.color,.83);ctx.lineWidth=.45;ctx.stroke();}
  }
}
if($('#hero-canvas')){
  fetch('assets/models.json').then(r=>{if(!r.ok)throw Error('Models unavailable');return r.json();}).then(models=>{
    const viewer=new ModelViewer($('#hero-canvas'),models.bag,{interactive:true,grid:true});
    const names={bag:'adventurer backpack',staff:'arcane staff',robot:'Atlas robot'};
    const captions={bag:'“A leather backpack, ready for adventure.”',staff:'“A violet crystal staff, a little out of the ordinary.”',robot:'“A blue-and-gold robot with a curious streak.”'};
    function choose(kind){viewer.setModel(models[kind],kind);$('#model-count').textContent=`${models[kind].parts.length} PARTS`;$('#preview-prompt').textContent=captions[kind];$('#hero-canvas').setAttribute('aria-label',`Interactive 3D preview of the ${names[kind]}. Drag or use arrow keys to rotate.`);$$('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.model===kind)));}
    $$('[data-model]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.model)));
    $$('[data-explore]').forEach(b=>b.addEventListener('click',()=>{choose(b.dataset.explore);$('#playground').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$('#hero-canvas').focus({preventScroll:true});}));
    $('#reset-view').addEventListener('click',()=>viewer.reset());
    $$('[data-sample]').forEach(canvas=>new ModelViewer(canvas,models[canvas.dataset.sample],{kind:canvas.dataset.sample}));
  }).catch(()=>{const note=$('.preview-disclaimer');note.textContent='Preview unavailable. The editable sample downloads are still available below.';note.style.fontSize='10px';});
}

function bindTabs(attribute){const buttons=$$(`[data-${attribute}]`);function select(button){buttons.forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('#'+b.getAttribute('aria-controls')).hidden=!active;});}buttons.forEach((b,i)=>{b.addEventListener('click',()=>select(b));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;select(buttons[index]);buttons[index].focus();}});});}
bindTabs('platform');bindTabs('host');
const completed=$$('[data-step]'),storageKey='voxelflow-setup-0.3.1';
if(completed.length){let state={};try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))state=parsed;}catch{}completed.forEach(box=>{box.checked=state[box.dataset.step]===true;});function progress(save=true){const count=completed.filter(box=>box.checked).length;$('#progress-label').textContent=`${count} / ${completed.length}`;$('#setup-progress').value=count;if(save){try{localStorage.setItem(storageKey,JSON.stringify(Object.fromEntries(completed.map(box=>[box.dataset.step,box.checked]))));}catch{}}}completed.forEach(box=>box.addEventListener('change',()=>progress()));$('#reset-progress').addEventListener('click',()=>{completed.forEach(box=>box.checked=false);progress();toast('Your setup checklist has been reset.');});progress(false);const sections=$$('.guide-section');let scheduled=false;function updateToc(){scheduled=false;let current=sections[0]?.id;for(const section of sections){if(section.getBoundingClientRect().top<=170)current=section.id;}$$('.guide-toc a').forEach(link=>{const active=link.hash==='#'+current;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(updateToc);}},{passive:true});updateToc();}
