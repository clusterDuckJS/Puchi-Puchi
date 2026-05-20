const i=(e,t=12e3)=>Promise.race([e,new Promise((s,o)=>{window.setTimeout(()=>o(new Error("Request timed out")),t)})]),r=e=>e?.message==="Request timed out";export{r as i,i as w};
