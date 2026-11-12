/* TierShift shared analytics consent banner. Keeps optional analytics off until a visitor opts in. */
(function(){
  'use strict';
  var key='tiershift-analytics-consent';
  function apply(value){
    if(typeof window.gtag==='function'){
      window.gtag('consent','update',{
        analytics_storage:value==='granted'?'granted':'denied',
        ad_storage:'denied',
        ad_user_data:'denied',
        ad_personalization:'denied'
      });
    }
    if(value==='granted' && typeof window.gtag==='function'){
      window.gtag('event','page_view',{page_location:window.location.href,page_title:document.title,page_path:window.location.pathname});
    }
    var banner=document.getElementById('ts-consent');
    if(banner)banner.hidden=true;
  }
  function init(){
    if(document.getElementById('ts-consent'))return;
    var banner=document.createElement('section');
    banner.id='ts-consent';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-live','polite');
    banner.setAttribute('aria-label','Cookie preferences');
    var p=document.createElement('p');
    var strong=document.createElement('strong');
    strong.textContent='Your privacy matters. ';
    p.append(strong,document.createTextNode('TierShift uses Google Analytics to understand aggregate website usage and improve the site. Analytics is optional and stays off unless you choose to allow it. '));
    var privacy=document.createElement('a');
    privacy.href='/privacy-policy/';
    privacy.textContent='Read our Privacy Policy.';
    p.append(privacy);
    var actions=document.createElement('div');
    actions.className='ts-actions';
    var yes=document.createElement('button');
    yes.type='button';yes.className='ts-accept';yes.textContent='Allow analytics';
    var no=document.createElement('button');
    no.type='button';no.className='ts-reject';no.textContent='Reject optional analytics';
    actions.append(yes,no);banner.append(p,actions);document.body.append(banner);
    function choose(value){
      try{localStorage.setItem(key,value)}catch(e){}
      apply(value);
    }
    yes.addEventListener('click',function(){choose('granted')});
    no.addEventListener('click',function(){choose('denied')});
    var saved=null;try{saved=localStorage.getItem(key)}catch(e){}
    if(saved==='granted'||saved==='denied')apply(saved);
    else banner.hidden=false;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();