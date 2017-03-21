'use strict';

const request = require('request-promise');
const _ = require('lodash');
const Promise = require('bluebird');
const cheerio = require('cheerio');
const url = require('url');
const moment = require('moment');

class LTNParser {

  constructor(options) {
    this._options = options;
  }

  parseArticleLinks($) {
    const links = $('#newslistul > .lipic > .picword')
      .map((index, el) => url.resolve(this._options.articlesUrl, $(el).attr('href')))
      .get();

    return links;
  }

  parseArticleMeta($) {
    const meta = $('#newslistul > .lipic').map((index, el) => {
      const $el = $(el);

      const heading = _.trim($('.picword', $el).text());
      const imageUrl = $('.realtimeListPic .pic85x60', $el).attr('src') || null;
      const publishedDate = _.trim($('> span', $el).text()) || null;
      const link = url.resolve(this._options.articlesUrl, $('> .picword', $el).attr('href'));
      const tabNum = $('> span > a', $el).eq(0).attr('class') || null;

      let category;

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
        category: category || null,
      };
    }).get();

    return meta;
  }

  parseArticleContent($, articleUrl) {
    const hostname = url.parse(articleUrl).hostname;
    
    let heading;
    const content = [];
    
    if (hostname === 'ent.ltn.com.tw') {
      const $newsContent = $('.news_content');

      $newsContent.children().each((index, el) => {
        if ($(el).prop('tagName').toLowerCase() === 'h1') {
          heading = $(el).text();
          return;
        }

        if ($(el).prop('tagName').toLowerCase() === 'script') {
          return;
        }

        if ($(el).hasClass('date')) {
          return;
        }

        if ($(el).hasClass('fb_like')) {
          return;
        }

        if ($(el).hasClass('fb-root')) {
          return;
        }

        if ($(el).hasClass('share')) {
          return;
        }

        if ($(el).hasClass('elselist')) {
          return;
        }

        if ($(el).hasClass('ad_double')) {
          return;
        }

        if ($(el).attr('id') === 'div-inread-ad') {
          return;
        }

        if ($(el).attr('id') === 'pv') {
          return;
        }

        content.push($(el).text());
      });

    } else if (hostname === 'sports.ltn.com.tw') {
      const $heading = $('.news_content > h1');
      heading = $heading.text();

      $('.news_content > .news_p').children().each((index, el) => {
        if ($(el).hasClass('share')) {
          return;
        }

        if ($(el).hasClass('fbcomments')) {
          return;
        }

        if ($(el).attr('id') === 'pv') {
          return;
        }

        if ($(el).prop('tagName').toLowerCase() === 'script') {
          return;
        }

        content.push($(el).text());
      });

    } else if (hostname === '3c.ltn.com.tw') {
      const $heading = $('.content > h1');
      heading = $heading.text();

      $('.main > .content > .conbox > .cont').children().each((index, el) => {
        if ($(el).children('.ph_b').length > 0) {
          return;
        }

        content.push($(el).text());
      });

    } else {
      const $heading = $('.guide.boxTitle').next('h1');
      heading = $heading.text();

      $('#newstext').children().each((index, el) => {
        var elId = $(el).attr('id');

        switch (elId) {
          case 'newspic':
          case 'newsad':
          case 'newsphoto':
            return;
        }

        if ($(el).hasClass('pic600')) {
          return;
        }

        if ($(el).prop('tagName').toLowerCase() === 'script') {
          return;
        }

        if ($(el).prop('tagName').toLowerCase() === 'span') {
          return;
        }

        content.push($(el).text());
      });
    }

    return _.trim(_.map(content, function(c) { return _.trim(c) }).join('\n'));
  }

  getArticleContent(articleUrl) {
    return new Promise((resolve, reject) => {
      request(articleUrl)
        .then((response) => {
          const $ = cheerio.load(response);
          const content = this.parseArticleContent($, articleUrl);
          resolve(content);
        })
        .catch(reject);
    });
  }

  getArticles() {
    return new Promise((resolve, reject) => {
      request(this._options.articlesUrl)
        .then((response) => {
          const $ = cheerio.load(response);
          const links = this.parseArticleLinks($);
          const articleMeta = this.parseArticleMeta($);

          const getArticlesPromise = Promise.map(articleMeta, (meta) => {
            return new Promise((resolve, reject) => {
              const articleUrl = meta.url;

              this.getArticleContent(articleUrl).then((content) => {
                meta.content = content;
                resolve(meta);
              }).catch(reject);
            });
          }, { concurrency: 4 });

          getArticlesPromise.then((articles) => {
            resolve(articles);
          }).catch(reject);
        });
    });
  }

}

module.exports = LTNParser;
