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
  function hasConsent(){
    try{return localStorage.getItem(key)==='granted'}catch(e){return false}
  }
  function track(name,params){
    if(hasConsent()&&typeof window.gtag==='function')window.gtag('event',name,params||{});
  }
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a');
    if(a){
      var href=a.getAttribute('href')||'';
      if(href.indexOf('/ai-tools/')===0 && href!='/ai-tools/'){
        track('ai_tool_profile_click',{link_url:href,link_text:(a.textContent||'').trim()});
      }else if(/pricing/i.test(href)||/pricing/i.test(a.textContent||'')){
        track('pricing_link_click',{link_url:a.href,link_text:(a.textContent||'').trim()});
      }else if(/^https?:/i.test(href)&&a.hostname!==location.hostname){
        track('provider_outbound_click',{link_url:a.href,link_domain:a.hostname,link_text:(a.textContent||'').trim()});
      }else if(/#contact|contact/i.test(href)){
        track('contact_link_click',{link_url:href,link_text:(a.textContent||'').trim()});
      }
    }
    var filter=e.target.closest&&e.target.closest('[data-cat]');
    if(filter)track('ai_category_filter',{category:filter.getAttribute('data-cat')||''});
  },true);
  document.addEventListener('change',function(e){
    var el=e.target;
    if(!el||!el.id)return;
    if(el.id==='cat')track('ai_category_filter',{category:el.value||'all'});
    if(el.id==='price')track('ai_pricing_filter',{pricing_type:el.value||'all'});
    if(el.id==='sort')track('ai_directory_sort',{sort_order:el.value});
    if(el.id==='currency')track('currency_preference_change',{currency:el.value});
    if(el.id==='q'&&el.value.trim())track('ai_tool_search',{search_term:el.value.trim().slice(0,80)});
  });
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