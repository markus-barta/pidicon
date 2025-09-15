#!/usr/bin/env fish

# Multi-device isolation test (uses mock hosts)
# Usage: ./scripts/test_multi_device.fish

set -l HOST_A 127.0.0.3
set -l HOST_B 127.0.0.4

node -e '
const SceneManager=require("./lib/scene-manager");
const {getContext}=require("./lib/device-adapter");
const logger=require("./lib/logger");
const fs=require("fs"),path=require("path");
(async()=>{
  const sm=new SceneManager();
  const root=process.cwd();
  const load=(dir)=>fs.readdirSync(dir).filter(f=>f.endsWith(".js")).forEach(f=>{const m=require(path.join(dir,f)); sm.registerScene(m.name||path.basename(f,".js"),m)});
  load(path.join(root,"scenes"));
  load(path.join(root,"scenes","examples"));
  const ok=(ip,s,ft)=>logger.ok(`AOK [${ip}] ${s} ${ft}`);
  const hostA=process.env.HOST_A||"127.0.0.3";
  const hostB=process.env.HOST_B||"127.0.0.4";
  const ctxA=getContext(hostA,"draw_api_animated_v2",{scene:"draw_api_animated_v2"},ok);
  const ctxB=getContext(hostB,"startup",{scene:"startup"},ok);
  await sm.switchScene("draw_api_animated_v2",ctxA);
  await sm.switchScene("startup",ctxB);
  await new Promise(r=>setTimeout(r,500));
  const stA=sm.getDeviceSceneState(hostA);
  const stB=sm.getDeviceSceneState(hostB);
  console.log("STATE_A",JSON.stringify(stA));
  console.log("STATE_B",JSON.stringify(stB));
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
'
