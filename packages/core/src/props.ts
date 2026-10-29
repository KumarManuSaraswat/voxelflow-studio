import {Asset, CubeData, faces, PropMaterial, PropMaterialsSchema, PropSpec, PropSpecSchema} from './schema';
import {encodePng} from './textures';

export const propAtlasSize={width:128,height:16};
export function propAtlasPixels(materials:PropMaterial[]) {
  const checked=PropMaterialsSchema.parse(materials),{width,height}=propAtlasSize;
  const pixels=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const color=checked[Math.floor(x/8)]?.color??'#202020',offset=(y*width+x)*4;
    const shade=y===0||x%8===0?1.12:y>12?0.78:x%8===7?0.9:1;
    for(let channel=0;channel<3;channel++)pixels[offset+channel]=Math.min(255,Math.round(parseInt(color.slice(1+channel*2,3+channel*2),16)*shade));
    pixels[offset+3]=255;
  }
  return pixels;
}
export function recolorProp(current:Uint8Array,before:PropMaterial[],updates:PropMaterial[]) {
  const original=PropMaterialsSchema.parse(before),changes=PropMaterialsSchema.parse(updates);
  if(changes.some(c=>!original.some(m=>m.name===c.name)))throw new Error('Use existing material names. Inspect the prop before recoloring it.');
  const materials=original.map(m=>changes.find(c=>c.name===m.name)??m);
  const old=propAtlasPixels(original),next=propAtlasPixels(materials),pixels=current.slice();
  if(pixels.length!==old.length)throw new Error('The prop atlas was resized; preserve it and recolor in Paint mode.');
  let preserved=0;
  for(let i=0;i<pixels.length;i+=4){if([0,1,2,3].every(c=>current[i+c]===old[i+c]))pixels.set(next.subarray(i,i+4),i);else preserved++;}
  return {materials,pixels,preserved};
}
export function generateProp(input:unknown):Asset {
  const spec=PropSpecSchema.parse(input),groups=[...new Set(['root',...spec.parts.map(p=>p.group)])];
  const cubes:CubeData[]=spec.parts.map(part=>{
    const x=spec.materials.findIndex(m=>m.name===part.material)*8;
    return {id:part.name,name:part.name,bone:part.group,from:part.from,to:part.to,origin:part.pivot??part.from.map((v,i)=>(v+part.to[i])/2) as [number,number,number],rotation:part.rotation,inflate:0,
      faces:Object.fromEntries(faces.map(side=>[side,{texture:'prop_atlas',uv:[x,0,x+8,16],rotation:0}])) as CubeData['faces']};
  });
  return {name:spec.name,namespace:spec.namespace,kind:'prop',bones:groups.map(name=>({name,...(name==='root'?{}:{parent:'root'}),pivot:[0,0,0],rotation:[0,0,0]})),cubes,
    textures:[{id:'prop_atlas',name:'prop_atlas',...propAtlasSize,png:encodePng(propAtlasPixels(spec.materials),128,16)}],mapping:{},animations:[],unsupported:[]};
}

// Offline examples and useful AI references. create_prop itself has no category enum.
export function propPreset(name:'bag'|'staff'):PropSpec {
  const parts:unknown[]=[];
  const cube=(name:string,from:number[],to:number[],material:string,group='body',rotation=[0,0,0])=>parts.push({name,from,to,material,group,rotation});
  if(name==='bag'){
    cube('leather_body',[-5,1,-2],[5,13,2.5],'leather');
    cube('reinforced_base',[-5.3,0.5,-2.3],[5.3,2,2.8],'dark_leather');
    cube('rounded_top',[-4.5,13,-1.5],[4.5,15,2.2],'leather');
    cube('overhanging_flap',[-5.3,11,-2.6],[5.3,14.5,-1.9],'dark_leather','flap');
    cube('front_pocket',[-3.4,3,-3.3],[3.4,8,-2],'leather','pocket');
    cube('pocket_flap',[-3.6,7.3,-3.6],[3.6,8.5,-2.7],'dark_leather','pocket');
    cube('pocket_clasp',[-0.5,6.6,-3.8],[0.5,7.6,-3.5],'brass','pocket');
    for(const [side,x] of [['left',-3],['right',3]] as const){
      cube(`${side}_front_strap`,[x-.55,8.7,-2.95],[x+.55,14.4,-2.6],'strap','straps');
      for(const [edge,from,to] of [
        ['top',[x-.85,10.6,-3.2],[x+.85,10.95,-2.9]],['bottom',[x-.85,9.2,-3.2],[x+.85,9.55,-2.9]],
        ['left',[x-.85,9.2,-3.2],[x-.5,10.95,-2.9]],['right',[x+.5,9.2,-3.2],[x+.85,10.95,-2.9]]
      ] as const)cube(`${side}_buckle_${edge}`,[...from],[...to],'brass','buckles');
      cube(`${side}_shoulder_top`,[x-.6,12.5,2.2],[x+.6,14,4.4],'strap','shoulder_straps');
      cube(`${side}_shoulder_back`,[x-.6,3,3.5],[x+.6,13.5,4.4],'strap','shoulder_straps');
      cube(`${side}_shoulder_bottom`,[x-.6,2,2.2],[x+.6,3.5,4.4],'strap','shoulder_straps');
      cube(`${side}_rivet`,[x-.25,12.9,-3.15],[x+.25,13.4,-2.95],'brass','buckles');
    }
    cube('handle_left',[-2,14,0],[-1.2,17,1],'strap','handle');cube('handle_right',[1.2,14,0],[2,17,1],'strap','handle');cube('handle_top',[-2,16.2,0],[2,17,1],'strap','handle');
    return PropSpecSchema.parse({name:'adventurer_bag',description:'Brown leather adventurer backpack with gold buckles, front pocket, carry handle, and two shoulder straps.',materials:[{name:'leather',color:'#92502c'},{name:'dark_leather',color:'#60351f'},{name:'strap',color:'#3a241b'},{name:'brass',color:'#deb34f'}],parts});
  }
  cube('wooden_shaft',[-.8,1,-.8],[.8,30,.8],'wood','shaft');
  cube('bottom_cap',[-1.1,0,-1.1],[1.1,2,1.1],'gold','fittings');
  cube('grip',[-1.05,10,-1.05],[1.05,18,1.05],'leather','grip');
  for(let i=0;i<4;i++)cube(`grip_wrap_${i}`,[-1.18,10.5+i*1.8,-1.18],[1.18,11.1+i*1.8,1.18],'gold','grip');
  cube('upper_collar',[-1.35,26,-1.35],[1.35,28,1.35],'gold','fittings');
  cube('crystal_socket',[-2.4,29,-1.7],[2.4,31,1.7],'gold','crown');
  cube('left_prong',[-4,29,-.65],[-2.8,35,.65],'gold','crown',[0,0,-20]);
  cube('right_prong',[2.8,29,-.65],[4,35,.65],'gold','crown',[0,0,20]);
  cube('crystal_core',[-2.1,31,-2.1],[2.1,37,2.1],'crystal','crystal',[0,45,0]);
  cube('crystal_tip',[-1.3,36,-1.3],[1.3,40,1.3],'crystal','crystal',[0,45,0]);
  cube('crystal_glint',[-.45,32,-3.05],[.45,36,-2.7],'highlight','crystal');
  cube('left_rune',[-1.6,22,-1.4],[-.6,24,-.9],'crystal','fittings');
  cube('right_rune',[.6,22,-1.4],[1.6,24,-.9],'crystal','fittings');
  return PropSpecSchema.parse({name:'arcane_staff',description:'Wooden wizard staff with a wrapped grip, gold fittings, forked crown, and violet crystal.',materials:[{name:'wood',color:'#62402b'},{name:'leather',color:'#302e42'},{name:'gold',color:'#e3b34e'},{name:'crystal',color:'#9e64ee'},{name:'highlight',color:'#e4ceff'}],parts});
}
