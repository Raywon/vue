const path = require('path');
const fs = require('fs'); //to file read
const lunr = require('lunr'); //텍스트 검색 라이브러리. JSON 문서를 인덱싱하고 텍스트 쿼리와 가장 잘 일치하는 문서를 검색하기 위한 간단한 검색 인터페이스를 제공
const ObjectID = require('mongodb').ObjectID;
const sanitizeHtml = require('sanitize-html'); //  html의 input 또는 textarea 또는 기타등등의 사용자 입력정보에 <script>문자</script> 이란 문자열을 적을시, 웹브라우저에서 문자열이 txt가 아닌 script 기술로 받아들여서 생기는 문제를 방지하는 모듈

exports.clear_session_value = function (session, session_var){
    const temp = session[session_var];
    session[session_var] = null;
    return temp;
};

//config파일 읽기
exports.read_config = function(){
    // preferred path, 선호 경로
    const configFile = path.join(__dirname, '..', 'config', 'config.json');  // ../config/config.json

    // depreciated path, 비선호 경로
    const defaultConfigFile = path.join(__dirname, 'config.js');   //   ./config.js

    if(fs.existsSync(defaultConfigFile) === true){  // fs.existsSync = 디렉토리 경로 입력
        // create config dir if doesnt exist
        const dir = path.join(__dirname, '..', 'config');

        if(!fs.existsSync(dir)){ //해당 경로가 존재하지않으면
            fs.mkdirSync(dir);  // 해당 경로를 생성
        }

        // if exists, copy our config from /routes to /config
        const tempconfig = fs.readFileSync(defaultConfigFile, 'utf8');
        fs.writeFileSync(configFile, tempconfig, 'utf8'); //파일쓰기(동기)
        // remove old file
        fs.unlinkSync(defaultConfigFile); // 파일 삭제
    }

    // load config file
    const rawData = fs.readFileSync(configFile, 'utf8');
    const loadedConfig = JSON.parse(rawData);

    if(loadedConfig.settings.database.type === 'mongodb'){
        loadedConfig.settings.database.connection_string = process.env.MONGODB_CONNECTION_STRING || loadedConfig.settings.database.connection_string;
    }

    if(typeof loadedConfig.settings.route_name === 'undefined' || loadedConfig.settings.route_name === ''){
        loadedConfig.settings.route_name = 'kb';
    }

    // set the environment depending on the NODE_ENV
    let environment = '.min';
    if(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined){
        environment = '';
    }
    loadedConfig.settings.env = environment;

    return loadedConfig;
};

exports.buildIndex = function(db, callback){
    const config = this.read_config();
    exports.dbQuery(db.kb, { kb_published: 'true' }, null, null, (err, kb_list) => {
        // build the index
        const index = new lunr.Index();
        index.field('kb_title');
        index.field('kb_keywords');
        index.ref('id');

        // add body to index if in config
        if(config.settings.index_article_body === true){
            index.field('kb_body');
        }

        // add to lunr index
        kb_list.forEach((kb) => {
            // only if defined
            let keywords = '';
            if(kb.kb_keywords !== undefined){

                keywords = kb.kb_keywords.toString().replace(/,/g, ' ');
            }

            const doc = {
                kb_title: kb.kb_title,
                kb_keywords: keywords,
                id: kb._id
            };

            // if index body is switched on
            if(config.settings.index_article_body === true){
                doc['kb_body'] = kb.kb_body;
            }

            index.add(doc);
        });
        callback(index);
    });
};

// This is called on the suggest url. If the value is set to false in the config
// a 403 error is rendered.
exports.suggest_allowed = function (req, res, next){
    const config = exports.read_config();
    if(config.settings.suggest_allowed === true){
        next();
        return;
    }
    res.render('error', { message: '403 - Forbidden', helpers: req.handlebars });
};

//custom 제목 중복 체크
exports.validate_title = function (db, data, callback) {

    // only validate title if it exists
    if (typeof data.kb_title === 'undefined' || data.kb_title === '') {
        callback(null, 'All good');
    } else {
        db.kb.count({ kb_title: data.kb_title }, (err, kb) => {
         console.log( kb , data.kb_type, '체크')
            
            if (kb > 0 && data.kb_type ==='insert') {
                callback('Title already exists', null); // eslint-disable-line
            }else if(kb > 1 && data.kb_type ==='edit'){
                callback('Title already exists', null); // eslint-disable-line
            }else {
                callback(null, 'All good');
            }
        });
    }
};


exports.validate_permalink = function (db, data, callback){
   
    // only validate permalink if it exists
    if(typeof data.kb_permalink === 'undefined' || data.kb_permalink === ''){
        callback(null, 'All good');
    }else{
        db.kb.count({ kb_permalink: data.kb_permalink }, (err, kb) => {
            if(kb > 0){
                callback('Permalink already exists', null); // eslint-disable-line
            }else{
                callback(null, 'All good');
            }
        });
    }
};

// This is called on all URL's. If the "password_protect" config is set to true
// we check for a login on thsoe normally public urls. All other URL's get
// checked for a login as they are considered to be protected. The only exception
// is the "setup", "login" and "login_action" URL's which is not checked at all.
exports.restrict = function (req, res, next){
    const config = exports.read_config();
    const url_path = req.url;

    // if not protecting we check for public pages and don't check_login
    if(url_path.substring(0, 5).trim() === '/'){
        if(config.settings.password_protect === false){
            next();
            return;
        }
    }
    if(url_path.substring(0, 7) === '/search' || url_path.substring(0, 6) === '/topic'){
        if(config.settings.password_protect === false){
            next();
            return;
        }
    }

    if(url_path.substring(0, config.settings.route_name.length + 1) === '/' + config.settings.route_name){
        if(config.settings.password_protect === false){
            next();
            return;
        }
    }

    if(url_path.substring(0, 12) === '/user_insert'){
        next();
        return;
    }

    // if the "needs_setup" session variable is set, we allow as
    // this means there is no user existing
    if(req.session.needs_setup === true){
        res.redirect(req.app_context + '/setup');
        return;
    }

    // if not a public page we
    exports.check_login(req, res, next);
};

// does the actual login check
exports.check_login = function (req, res, next){
    // set template dir
    exports.setTemplateDir('admin', req);

    if(req.session.user){
        next();
    }else{
        res.redirect(req.app_context + '/login');
    }
};

// exposes select server side settings to the client
exports.config_expose = function (app){
    const config = exports.read_config();
    const clientConfig = {};
    clientConfig.route_name = config.settings.route_name !== undefined ? config.settings.route_name : 'kb';
    clientConfig.add_header_anchors = config.settings.add_header_anchors !== undefined ? config.settings.add_header_anchors : false;
    clientConfig.links_blank_page = config.settings.links_blank_page !== undefined ? config.settings.links_blank_page : true;
    clientConfig.typeahead_search = config.settings.typeahead_search !== undefined ? config.settings.typeahead_search : true;
    clientConfig.enable_spellchecker = config.settings.enable_spellchecker !== undefined ? config.settings.enable_spellchecker : true;
    clientConfig.mermaid = config.settings.mermaid !== undefined ? config.settings.mermaid : false;
    clientConfig.mermaid_options = config.settings.mermaid_options;
    clientConfig.mermaid_auto_update = config.settings.mermaid_auto_update !== undefined ? config.settings.mermaid_auto_update : true;
    app.expose(clientConfig, 'config');
};

exports.setTemplateDir = function (type, req){
    const config = exports.read_config();
    if(type !== 'admin'){
        // if theme selected, override the layout dir
        const layoutDir = config.settings.theme ? path.join(__dirname, '../public/themes/', config.settings.theme, '/views/layouts/layout.hbs') : path.join(__dirname, '../views/layouts/layout.hbs');
        const viewDir = config.settings.theme ? path.join(__dirname, '../public/themes/', config.settings.theme, '/views') : path.join(__dirname, '../views');

        // set the views dir
        req.app.locals.settings.views = viewDir;
        req.app.locals.layout = layoutDir;
    }else{
        // set the views dir
        req.app.locals.settings.views = path.join(__dirname, '../views/');
        req.app.locals.layout = path.join(__dirname, '../views/layouts/layout.hbs');
    }
};

exports.getId = function (id){
    const config = exports.read_config();
    if(config.settings.database.type === 'embedded'){
        return id;
    }
    if(id.length !== 24){
        return id;
    }

    let returnID = '';
    try{
        returnID = ObjectID(id);
        return returnID;
    }catch(ex){
        return id;
    }
};

exports.sanitizeHTML = function(html){
    // eslint-disable-next-line no-return-assign
    return sanitizeHtml(html, {
        allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
            'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
            'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'iframe'
        ],
        allowedAttributes: false
    });
};

exports.dbQuery = function (db, query, sort, limit, callback){
    const config = exports.read_config();
    if(config.settings.database.type === 'embedded'){
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).exec((err, results) => {
                callback(null, results);
            });
        }else{
            db.find(query).exec((err, results) => {
                callback(null, results);
            });
        }
    }else{
        if(sort && limit){
            db.find(query).sort(sort).limit(parseInt(limit)).toArray((err, results) => {
                callback(null, results);
            });
        }else{
            db.find(query).toArray((err, results) => {
                callback(null, results);
            });
        }
    }
};

exports.safe_trim = function (str){
    if(str !== undefined){
        return str.trim();
    }
    return str;
};
