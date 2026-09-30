/**
 * Läuft vor dem ersten Zeichnen im <head>: setzt die Klasse .dark am <html>.
 * Einstellung (localStorage "theme"): "auto" (Standard) | "light" | "dark".
 * "auto" = dunkel zwischen Sonnenuntergang und Sonnenaufgang in Neuss.
 * Druckseiten bleiben immer hell.
 */
export const themeScript = `(function(){
var LAT=51.2,LNG=6.69,KEY="theme";
function sun(now){
  var r=Math.PI/180,y=now.getUTCFullYear();
  var n=Math.floor((Date.UTC(y,now.getUTCMonth(),now.getUTCDate())-Date.UTC(y,0,0))/864e5);
  var g=2*Math.PI/365*(n-1);
  var eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  var d=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  var ha=Math.acos(Math.cos(90.833*r)/(Math.cos(LAT*r)*Math.cos(d))-Math.tan(LAT*r)*Math.tan(d))/r;
  var noon=720-4*LNG-eq,day=Date.UTC(y,now.getUTCMonth(),now.getUTCDate());
  return [day+(noon-4*ha)*6e4,day+(noon+4*ha)*6e4];
}
function pref(){try{return localStorage.getItem(KEY)||"auto"}catch(e){return"auto"}}
function isDark(p){
  var path=location.pathname;if(path.indexOf("/stundennachweis")===0||path.indexOf("/datenschutz-kenntnisnahme")===0)return false;
  if(p==="dark")return true;if(p==="light")return false;
  var now=new Date(),t=sun(now);return now.getTime()<t[0]||now.getTime()>t[1];
}
function apply(){var p=pref();document.documentElement.classList.toggle("dark",isDark(p));document.documentElement.dataset.themePref=p;}
window.__setTheme=function(p){try{localStorage.setItem(KEY,p)}catch(e){}apply();window.dispatchEvent(new Event("themechange"));};
apply();
setInterval(apply,60000);
})();`;
