const request = require('request-promise');
const _ = require('lodash');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const url = require('url');
const moment = require('moment');

require('dotenv').config();

const LTN_NEWS_URL_ROOT = process.env.LTN_NEWS_URL_ROOT;

exports.handler = function(event, context, cb) {

  request(LTN_NEWS_URL_ROOT)
    .then(function(response) {
      var $ = cheerio.load(response);

      var links = $('#newslistul > .lipic > .picword').map(function() { return url.resolve(LTN_NEWS_URL_ROOT, $(this).attr('href')) }).get();
      
      var newsMeta = $('#newslistul > .lipic').map(function() {
        var $this = $(this);

        var heading = _.trim($('.picword', $this).text());
        var imageUrl = $('.realtimeListPic .pic85x60', $this).attr('src') || null;
        var publishedDate = _.trim($('> span', $this).text()) || null;
        var link = url.resolve(LTN_NEWS_URL_ROOT, $('> .picword', $this).attr('href'));

        var tabNum = $('> span > a', $this).eq(0).attr('class') || null;
        var category;
        switch (tabNum) {
          case 'tab1':
            category = 'focus';
            break;

          case 'tab2':
            category = 'politics';
            break;

          case 'tab3':
            category = 'society';
            break;

          case 'tab4':
            category = 'life';
            break;

          case 'tab5':
            category = 'world';
            break;

          case 'tab6':
            category = 'talk';
            break;

          case 'tab7':
            category = 'business';
            break;

          case 'tab8':
            category = 'sports';
            break;

          case 'tab9':
            category = 'local';
            break;

          case 'tab10':
            category = 'entertainment';
            break;

          case 'tab11':
            category = 'consumer';
            break;

          case 'tab12':
            category = 'supplement';
            break;

          case 'tab13':
            category = '3c';
            break;

          case 'tab14':
            category = 'cars';
            break;

          case 'tab15':
            category = 'istyle';
            break;
        }

        return {
          heading: heading,
          url: link,
          imageUrl: imageUrl,
          publishedDate: moment(publishedDate + ' +0800', 'YYYY-MM-DD HH:mm Z').valueOf(),
          category: category || null
        };
      }).get();

      var errors = 0;

      Promise.map(links, function(link) {
        return request(link)
          .then(function(response) {
            var $ = cheerio.load(response);
            var hostname = url.parse(link).hostname;

            var heading;
            var newsContent = [];
            
            if (hostname === 'ent.ltn.com.tw') {
              var $newsContent = $('.news_content');

              $newsContent.children().each(function() {
                if ($(this).prop('tagName').toLowerCase() === 'h1') {
                  heading = $(this).text();
                  return;
                }

                if ($(this).prop('tagName').toLowerCase() === 'script') {
                  return;
                }

                if ($(this).hasClass('date')) {
                  return;
                }

                if ($(this).hasClass('fb_like')) {
                  return;
                }

                if ($(this).hasClass('fb-root')) {
                  return;
                }

                if ($(this).hasClass('share')) {
                  return;
                }

                if ($(this).hasClass('elselist')) {
                  return;
                }

                if ($(this).hasClass('ad_double')) {
                  return;
                }

                if ($(this).attr('id') === 'div-inread-ad') {
                  return;
                }

                if ($(this).attr('id') === 'pv') {
                  return;
                }

                newsContent.push($(this).text());
              });

            } else if (hostname === 'sports.ltn.com.tw') {
              var $heading = $('.news_content > h1');
              heading = $heading.text();

              $('.news_content > .news_p').children().each(function() {
                if ($(this).hasClass('share')) {
                  return;
                }

                if ($(this).hasClass('fbcomments')) {
                  return;
                }

                if ($(this).attr('id') === 'pv') {
                  return;
                }

                if ($(this).prop('tagName').toLowerCase() === 'script') {
                  return;
                }

                newsContent.push($(this).text());
              });

            } else {
              var $heading = $('.guide.boxTitle').next('h1');
              heading = $heading.text();

              $('#newstext').children().each(function() {
                var elId = $(this).attr('id');

                switch (elId) {
                  case 'newspic':
                  case 'newsad':
                  case 'newsphoto':
                    return;
                }

                if ($(this).hasClass('pic600')) {
                  return;
                }

                if ($(this).prop('tagName').toLowerCase() === 'script') {
                  return;
                }

                if ($(this).prop('tagName').toLowerCase() === 'span') {
                  return;
                }

                newsContent.push($(this).text());
              });
            }

            if (!heading) {
              errors += 1;
            } else {
              heading = _.trim(heading);
              newsContent = _.trim(_.map(newsContent, function(c) { return _.trim(c) }).join('\n'));
            }

            return Promise.resolve(newsContent);
          });

      }, { concurrency: 4 })
        .then(function(newsContent) {
          console.log('all links count: ' + links.length);
          console.log('error count: ' + errors);

          var newsData = _.map(newsContent, function(content, index) {
            var meta = newsMeta[index];
            meta.content = content;
            return meta;
          });

          // console.log(newsData);

          return request({
            method: 'PUT',
            uri: process.env.FIREBASE_URL,
            qs: { auth: process.env.FIREBASE_SECRET },
            json: newsData
          });
        })
        .then(function(response) {
          cb(null, { status: 'done' });
        });

    });

};
