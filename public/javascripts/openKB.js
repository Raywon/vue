$(document).ready(function(){
    // add the responsive image class to all images
    $('.body_text img').each(function(){
        $(this).addClass('img-responsive');
    });

    // make all links in articles open in new window/tab
    if(config.links_blank_page === true){
        $('.body_text a'); //.attr('target', '_blank');
    }

    // setup mermaid charting
    if(typeof mermaid !== 'undefined' && config.mermaid){
        //defaults - can be overridden in config.json by specifying mermaid_options
        //TODO: Consider adding mermaid_options to settings page? 
        var mermaid_opts = {
            "theme" : "forest",
            "flowchart": { "curve": "linear" },
            "gantt": { "axisFormat": "%Y/%m/%d" },
            "sequence": { "actorMargin": 20 },
            "securityLevel": "loose" 
        };
        // Merge mermaid_options into mermaid_opts, recursively
        $.extend( true, mermaid_opts, config.mermaid_options || {} );
        mermaid_opts.startOnLoad = true;
        mermaid.initialize(mermaid_opts);
    }

    // add the table class to all tables
    $('table').each(function(){
        $(this).addClass('table table-hover');
    });

    // When the version dropdown changes
    $(document).on('change', '#kb_versions', function(){
        // get the article from the API
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/api/getArticleJson',
            data: {kb_id: $(this).val()}
        })
        .done(function(article){
            $('#frm_kb_title').val(article.kb_title);
            simplemde.value(article.kb_body);
            $('#btnSettingsMenu').trigger('click');
        })
        .fail(function(msg){
            show_notification(msg.responseText, 'danger');
        });
    });



    // hookup the typeahead search
    if(config.typeahead_search === true){
        // on pages which have the search form
        if($('#frm_search').length){
            $('#frm_search').on('keyup', function(){
                if($('#frm_search').val().length > 2){
                    $.ajax({
                        method: 'POST',
                        url: $('#app_context').val() + '/search_api',
                        data: {searchTerm: $('#frm_search').val()}
                    })
                    .done(function(response){
                        if(response.length === 0){
                            $('#searchResult').addClass('hidden');
                        }else{
                            $('.searchResultList').empty();
                            $('.searchResultList').append('<li class="list-group-item list-group-heading" ">Search results</li>');
                            $.each(response, function(key, value){
                                var faqLink = value.kb_permalink;
                                if(typeof faqLink === 'undefined' || faqLink === ''){
                                    faqLink = value._id;
                                }
                                var searchitem = '<li class="list-group-item"><a  href="' + $('#app_context').val() + '/' + config.route_name + '/' + faqLink + '">' + value.kb_title+'</a></li>';
                                $('.searchResultList').append(searchitem);
                            });
                            $('#searchResult').removeClass('hidden');
                        }
                    });
                }else{
                    $('.searchResultList').empty();
                    $('#searchResult').addClass('hidden');
                }
            });
        }
    }

    // setup the push menu
    if($('.toggle-menu').length){
        $('.toggle-menu').jPushMenu({closeOnClickOutside: false});
    }

    // highlight any code blocks
    $('pre code').each(function(i, block){
        hljs.highlightBlock(block);
    });

    // add the table class to all tables
    if(config.add_header_anchors === true){
        $('.body_text > h1, .body_text > h2, .body_text > h3, .body_text > h4, .body_text > h5').each(function(){
            $(this).attr('id', convertToSlug($(this).text()));
            $(this).prepend('<a class="headerAnchor" href="#' + convertToSlug($(this).text()) + '">#</a> ');
        });
    }

    // scroll to hash point
    if(window.location.hash){
        // if element is found, scroll to it
        if($(window.location.hash).length){
            var element = $(window.location.hash);
            $(window).scrollTop(element.offset().top).scrollLeft(element.offset().left);
        }
    }

    // add the token field to the keywords input
    if($('#frm_kb_keywords').length){
        $('#frm_kb_keywords').tokenfield();
    }

    // SimpleMDE is javascript markdown editor.
    // https://github.com/sparksuite/simplemde-markdown-editor
    if($('#editor').length){


        const resize_image = {
            name: "redText",
            action: resize,
            className: "fa fa-expand", // Look for a suitable icon
            //title: "Red text (Ctrl/Cmd-Alt-R)",
        }

        // setup editors
        var simplemde = new SimpleMDE({
            element: $('#editor')[0],
            spellChecker: config.enable_spellchecker,
            toolbar: ['bold', 'italic', 'heading-1','heading-2','heading-3', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'table', 'preview','horizontal-rule', 'code', 'guide', resize_image]
        });

        function resize(editor) {

            var cm = editor.codemirror;
            var output = '';
            var selectedText = cm.getSelection();
            //var text = selectedText || 'placeholder';
        
            output = '<img src="" width="200px" >' //'!!' + text + '!!';
            cm.replaceSelection(output);
        
        }

        // setup inline attachments
        inlineAttachment.editors.codemirror4.attach(simplemde.codemirror, {uploadUrl: $('#app_context').val() + '/file/upload_file'});
        
        // do initial convert on load
        (true); //true means this is first call - do all rendering    

        // auto scrolls the simpleMDE preview pane
        var preview = document.getElementById('preview');
        if(preview !== null){

            //timed re-render (virtual speedup) - i.e. only call convertTextAreaToMarkdown() after xxxms of inactivity to reduce redraws
            var timer = null;
            //TODO: Consider adding the renderDelayTime to settings
            var renderDelayTime = 500;//only re-render when user stops changing text
            
            // attach to editor changes and update preview
            simplemde.codemirror.on('change', function(){
               
                if(timer != null)
                    clearTimeout(timer);
                timer = setTimeout(function(){
                    convertTextAreaToMarkdown(false);//pass false to indicate this call is due to a code change
                }, renderDelayTime);
            });

            // Syncs scroll  editor -> preview
            var cScroll = false;
            var pScroll = false;
            simplemde.codemirror.on('scroll', function(v){
                if(cScroll){
                    cScroll = false;
                    return;
                }
                pScroll = true;
                var height = v.getScrollInfo().height - v.getScrollInfo().clientHeight;
                var ratio = parseFloat(v.getScrollInfo().top) / height;
                var move = (preview.scrollHeight - preview.clientHeight) * ratio;
                preview.scrollTop = move;
            });

            // Syncs scroll  preview -> editor
            preview.onscroll = function(){
                if(pScroll){
                    pScroll = false;
                    return;
                }
                cScroll = true;
                var height = preview.scrollHeight - preview.clientHeight;
                var ratio = parseFloat(preview.scrollTop) / height;
                var move = (simplemde.codemirror.getScrollInfo().height - simplemde.codemirror.getScrollInfo().clientHeight) * ratio;
                simplemde.codemirror.scrollTo(0, move);
            };
        }


    // customed
    const app = document.getElementById("app");
    //const status = document.getElementById("app");
    //const toolTip = document.getElementById("tooltip");
    // const tweeter = document.getElementById("tweet");
    /**
     * Helper to reset classnames
     */
    let alertStatus = (el, className) => {
        el.className = "";
        el.classList.add(className);

        if (el.className === "red") {
            $('#searchResult').addClass('hidden');
        }
    }
    
     let handleSelectionChange = event => {

        // Get the current selection from the window object
        let selection = window.getSelection().toString();
        //console.log(selection , '선택된 셀렉션')
        // Win condition
        let selectionValid = selection.length > 1;

        // Fail conditions
        let selectionEmpty = selection.length === 0;
        let selectionInvalid = (selection.length <= 1 || selection.length >= 280);

        // Bail early if empty
        if (selectionEmpty) {
            $('.searchResultList').empty();
            $('.searchResultList2').empty();
            //console.log('엠티')
            return;
        }

        // Bail early if empty too small or too large
        if (selectionInvalid) {
            $('.searchResultList').empty();
            $('.searchResultList2').empty();
            //console.log('엠티2')
        }

        // Finally, promote the tweet button 2글자부터 실행
        if (selectionValid) {
            $('.searchResultList').empty();
            $('.searchResultList2').empty();
            selectText()
        }
    }

    
    //한번만 실행하게하기
   document.addEventListener("selectionchange", handleSelectionChange);

   let message = ''
    let btn_arr = []

    pageMaker=(message, arr)=>{
        const url_value = $('#app_context').val()
        $('.searchResultList2').empty();

        //keyword는 title로 생성
        let btn_inner = ''

        if(arr.includes(message)){ //제목이 존재할때  
            btn_inner =  '<button disabled  class="link_btn" id="frm_edit_kb_save2" type="button" >' +"'"+message+"'"+'페이지 이미존재 생성불가' + '</button>'
        }else{ // 제목이 존재하지 않을때
            btn_inner =  '<button class="link_btn" id="frm_edit_kb_save2" type="button" style="width:172px !important"  onclick="page_fuc()" >' +"'"+message+"'"+'페이지 생성' + '</button>'
        }
        var searchitem = 
        '<form method="post" id="edit_form2" action="'+url_value+'/insert_kb2" data-toggle="validator">'
        
        + btn_inner
        +'<input style="display:none" name="frm_kb_title2" id="frm_kb_title2" value="'+message+'" required />'
        +'<input style="display:none" name="frm_kb_body2" id="frm_kb_body2">'
        +'<input style="display:none" name="frm_kb_permalink2" id="frm_kb_permalink2">'
        +'<input style="display:none" id="frm_kb_published2" name="frm_kb_published2" value="true">'
        +'</form>'

        $('.searchResultList2').append(searchitem);
        $('#frm_kb_keywords2').tokenfield();

    }

    //링크 검색 함수
    selectText = () => {
        let selectionText = "";
        // console.log(window.getSelection().baseNode.parentNode.id)
        if (true) {
            selectionText = document.getSelection();
            let sel = window.getSelection();
            // let range = sel.getRangeAt(0);
            // let start = range.startOffset; //드래그 시작 offset
            // let end = range.endOffset; //드래스 끝 offset
            let line = sel.toString() //줄바뀜 포함 표출
            let enter_checker = line.split('\n').length - 1 // \n의개수 파악
            let space_checker = line.split(' ').length - 1 // \n의개수 파악
           
            if (enter_checker == 0 && space_checker < 21) { //br태그가 없고 띄어쓰기 일정개수 이하일경우 해당 데이터 표출
                //console.log(enter_checker, space_checker,'줄바꿈 스페이스')
                message = line  //드래그한 문자열

                //퍼머링크 데이터 array로 불러오기
                $.ajax({
                    method: 'POST',
                    url: $('#app_context').val() + '/search_api',
                    data: { searchTerm: message }
                })
                    .done((response) => {
                        //링크 유무 검사
    
                        if (response.length === 0) {                         
                            //$('#searchResult').addClass('hidden');
                        } else {
                            $('.searchResultList').empty();
                            //$('.searchResultList').append('<li class="list-group-item list-group-heading" style="  white-space:nowrap;">Search results</li>');
                            $.each(response, function (key, value) {
                                var faqLink = value.kb_permalink;
                            
                                if (typeof faqLink === 'undefined' || faqLink === '') {
                                    faqLink = value._id; 
                                }
                                var searchitem = ' <button class="link_btn" type="button" onclick="btn_fuc('+'\''+faqLink+'\')"  >' + value.kb_title + '</button>'
                                $('.searchResultList').append(searchitem);
                            });
                            $('#searchResult').removeClass('hidden');
                        }
                        //검색데이터 
                        link_arr = link_check(response)
                        pageMaker(message , link_arr)
                    })
                    .catch((error) => {
                        console.log(error);
                    });
                return selectionText;
            } else { // 그렇지 않을경우 ""값 출력
                $('#searchResult').addClass('hidden');
            }
        }
    }

    //검색된 리스트 버튼 함수
    btn_fuc=(newlink)=>{
        var cm = simplemde.codemirror;
        var text;
        var start = '[';
        var end = '](/kfpa/'+newlink+')';
        var startPoint = cm.getCursor('start');
        var endPoint = cm.getCursor('end');
     
        text = cm.getSelection();
        cm.replaceSelection(start + text + end);
    
        startPoint.ch += start.length;
        endPoint.ch = end.ch + text.length;
    
        cm.setSelection(startPoint, endPoint);
        cm.focus();
        $('#searchResult').addClass('hidden'); //검색목록 삭제

    };

     page_fuc=()=>{
        var cm = simplemde.codemirror;
        link_define(cm)
     }
    //var Target = document.getElementById("page_btn");

    link_check = (elem) => {
        btn_arr = []
        //console.log(elem, '바인딩')
        elem.forEach(element => {
            btn_arr.push(element.kb_title)
        })
        // Target.innerText = btn_arr
        return btn_arr
        }
    }

    // Editor save button clicked
    $(document).on('click', '#frm_edit_kb_save', function(e){
        e.preventDefault();
        if($('#versionSidebar').length){
            // only save if a version is edited
            if($('#frm_kb_edit_reason').val() === ''){
                show_notification('Please enter a reason for editing article', 'danger');
                $('#btnVersionMenu').trigger('click');
                $('#frm_kb_edit_reason').focus();
            }else{
                $('#edit_form').submit();
            }
        }else{
            $('#edit_form').submit();
            
        }
    });

       // Editor save button clicked
    $(document).on('click', '#frm_edit_kb_save_middle', function(e){
        
        e.preventDefault();
        //console.log('save 완료!')
        if($('#versionSidebar').length){
            // only save if a version is edited
            if($('#frm_kb_edit_reason').val() === ''){
                 show_notification('Please enter a reason for editing article', 'danger');
                 $('#btnVersionMenu').trigger('click');
                 $('#frm_kb_edit_reason').focus();
            }else{

            action_url =  $('#app_context').val() + '/save_kb2',
            $('#edit_form').attr("action",action_url)          
            $('#edit_form').submit();
            }
        }else{
            action_url =  $('#app_context').val() + '/save_kb2',
            $('#edit_form').attr("action",action_url)          
            $('#edit_form').submit();
        }
    });


        
        // Editor save button clicked2
    $(document).on('click', '#frm_edit_kb_save2', function(e){
        e.preventDefault();
        //console.log('save 완료!')
        if($('#versionSidebar').length){
            // only save if a version is edited
            if($('#frm_kb_edit_reason').val() === ''){
                show_notification('Please enter a reason for editing article', 'danger');
                $('#btnVersionMenu').trigger('click');
                $('#frm_kb_edit_reason').focus();
            }else{
                $('#edit_form2').submit();
            }
        }else{
            $('#edit_form2').submit();
        }
    });

    // Version edit button clicked
    $(document).on('click', '.btnEditVersion', function(e){
        $('#btnVersionMenu').trigger('click');
        $.LoadingOverlay('show', {zIndex: 9999});
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/api/getArticleJson',
            data: {kb_id: $(this).parent().attr('id')}
        })
        .done(function(article){
            $.LoadingOverlay('hide');
            // populate data from fetched article
            $('#frm_kb_title').val(article.kb_title);
            simplemde.value(article.kb_body);
        })
        .fail(function(msg){
            $.LoadingOverlay('hide');
            show_notification(msg, 'danger');
        });
    });

    // Version delete button clicked
    $(document).on('click', '.btnDeleteVersion', function(e){
        var groupElement = $(this).closest('.versionWrapper');
        $('#btnVersionMenu').trigger('click');
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/api/deleteVersion',
            data: {kb_id: $(this).parent().attr('id')}
        })
        .done(function(article){
            // remove the version elements from DOM
            groupElement.remove();
            show_notification('Version removed successfully', 'success');
        })
        .fail(function(msg){
            show_notification(JSON.parse(msg.responseText).message, 'danger');
        });
    });


    // if in the editor, trap ctrl+s and cmd+s shortcuts and save the article
    if($('#frm_editor').val() === 'true'){
        $(window).bind('keydown', function(event){
            if(event.ctrlKey || event.metaKey){
                if(String.fromCharCode(event.which).toLowerCase() === 's'){
                    event.preventDefault();
                    $('#frm_edit_kb_save').click();
                }
            }
        });
    }

    // Call to API for a change to the published state of a KB
    $("input[class='published_state']").change(function(){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/published_state',
            data: {id: this.id, state: this.checked}
        })
        .done(function(msg){
            show_notification(msg, 'success');
        })
        .fail(function(msg){
            show_notification(msg.responseText, 'danger');
        });
    });

    // convert editor markdown to HTML and display in #preview div
    //firstRender indicates this is a first call (i.e. not a re-render request due to a code editor change) 
    function convertTextAreaToMarkdown(firstRender){
        
        var classy = window.markdownItClassy;

        var mark_it_down = window.markdownit({html: true, linkify: true, typographer: true, breaks: true});
        mark_it_down.use(classy);

        if(typeof mermaid !== 'undefined' && config.mermaid){
            
            var mermaidChart = function(code) {
                try {
                    mermaid.parse(code)
                    return '<div class="mermaid">'+code+'</div>';
                } catch ({ str, hash }) {
                    return '<pre><code>'+code+'</code></pre>';
                }
            }
            
            var defFenceRules = mark_it_down.renderer.rules.fence.bind(mark_it_down.renderer.rules)
            mark_it_down.renderer.rules.fence = function(tokens, idx, options, env, slf) {
            var token = tokens[idx]
            var code = token.content.trim()
            if (token.info === 'mermaid') {
                return mermaidChart(code)
            }
            var firstLine = code.split(/\n/)[0].trim()
            if (firstLine === 'gantt' || firstLine === 'sequenceDiagram' || firstLine.match(/^graph (?:TB|BT|RL|LR|TD);?$/)) {
                return mermaidChart(code)
            }
            return defFenceRules(tokens, idx, options, env, slf)
            }
        }
   
        var html = mark_it_down.render(simplemde.value());
    

        // add responsive images and tables
        var fixed_html = html.replace(/<img/g, "<img class='img-responsive' ");
        fixed_html = fixed_html.replace(/<table/g, "<table class='table table-hover' ");

        var cleanHTML = sanitizeHtml(fixed_html, {
            allowedTags: [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
                'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
                'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre', 'img', 'iframe'
            ],
            allowedAttributes: false
        });

        $('#preview').html(cleanHTML);

        // re-hightlight the preview
        $('pre code').each(function(i, block){
            hljs.highlightBlock(block);
        });

        if(!firstRender && typeof mermaid !== 'undefined' && (config.mermaid && config.mermaid_auto_update)) {
            mermaid.init();//when this is not first render AND mermaid_auto_update==true, re-init mermaid charts (render code changes)
        }

    }

    // user up vote clicked
    $(document).on('click', '#btnUpvote', function(){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/vote',
            data: {'doc_id': $('#doc_id').val(), 'vote_type': 'upvote'}
        })
        .done(function(msg){
            show_notification(msg, 'success', true);
        })
        .fail(function(msg){
            show_notification(msg.responseText, 'danger');
        });
    });

    // user down vote clicked
    $(document).on('click', '#btnDownvote', function(){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/vote',
            data: {'doc_id': $('#doc_id').val(), 'vote_type': 'downvote'}
        })
        .done(function(msg){
            show_notification(msg, 'success', true);
        })
        .fail(function(msg){
            show_notification(msg.responseText, 'danger');
        });
    });

    // Call to API to check if a permalink is available
    $('#validate_permalink').click(function(){
        if($('#frm_kb_permalink').val() !== ''){
            $.ajax({
                method: 'POST',
                url: $('#app_context').val() + '/api/validate_permalink',
                data: {'permalink': $('#frm_kb_permalink').val(), 'doc_id': $('#frm_kb_id').val()}
            })
            .done(function(msg){
                show_notification(msg, 'success');
              
            })
            .fail(function(msg){
                show_notification(msg.responseText, 'danger');
              
            });
        }else{
            show_notification('Please enter a permalink to validate', 'danger');
        }
    });

    // generates a random permalink
    $('#generate_permalink').click(function(){
        var min = 100000;
        var max = 999999;
        var num = Math.floor(Math.random() * (max - min + 1)) + min;
        $('#frm_kb_permalink').val(num);
    });

    // function to slugify strings
    function slugify(str) {
        var $slug = '';
        var trimmed = $.trim(str);
        $slug = trimmed.replace(/[^a-z0-9-æøå]/gi, '-').
        replace(/-+/g, '-').
        replace(/^-|-$/g, '').
        replace(/æ/gi, 'ae').
        replace(/ø/gi, 'oe').
        replace(/å/gi, 'a');
        return $slug.toLowerCase();
    }

    // generates a permalink from title with form validation
    $('#frm_kb_title').change(function(){
        var title = $(this).val();
        if (title && title.length > 5) {
            $('#generate_permalink_from_title').removeClass('disabled');
            $('#generate_permalink_from_title').click(function(){
                var title = $('#frm_kb_title').val();
                if (title && title.length > 5) {
                    $('#frm_kb_permalink').val(slugify(title));
                }
            });
        } else {
            $('#generate_permalink_from_title').addClass('disabled');
        }
    });
    // applies an article filter
    $('#btn_articles_filter').click(function(){
        window.location.href = $('#app_context').val() + '/articles/' + encodeURIComponent($('#article_filter').val());
    });

    // resets the article filter
    $('#btn_articles_reset').click(function(){
        window.location.href = $('#app_context').val() + '/articles';
    });

    // search button click event
    $('#btn_search').click(function(event){
        if($('#frm_search').val() === ''){
            show_notification('Please enter a search value', 'danger');
            event.preventDefault();
        }
    });

    if($('#input_notify_message').val() !== ''){
        // save values from inputs
        var message_val = $('#input_notify_message').val();
        var message_type_val = $('#input_notify_message_type').val();

        // clear inputs
        $('#input_notify_message').val('');
        $('#input_notify_message_type').val('');

        // alert
        show_notification(message_val, message_type_val, false);
    }

    
});


// Calls the API to delete a file
$(document).on('click', '.file_delete_confirm', function(e){
    e.preventDefault();
    var fileId = $(this).attr('data-id');
    var filePath = $(this).attr('data-path');

    if(window.confirm('Are you sure you want to delete the file?')){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/file/delete',
            data: {img: filePath}
        })
        .done(function(msg){
            $('#file-' + fileId).remove();
            show_notification(msg, 'success');
        })
        .fail(function(msg){
            show_notification(msg, 'danger');
        });
    }
});

// show notification popup
function show_notification(msg, type, reload_page){
    // defaults to false
    reload_page = reload_page || false;

    $('#notify_message').removeClass();
    $('#notify_message').addClass('notify_message-' + type);
    $('#notify_message').html(msg);
    $('#notify_message').slideDown(600).delay(1200).slideUp(600, function(){
        if(reload_page === true){
            location.reload();
        }
    });
}

function search_form(id){
    $('form#' + id).submit();
}

function convertToSlug(text){
    return text
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
}

function link_define(cm){
    console.log('1차실행~')

    playAlert = setInterval(() => {
        $.ajax({
            method: 'GET',
            url: $('#app_context').val() + '/link_check',
        }).done((res) => {
            if (res === '') { console.log('계속') }
            else if (res !== '') {
                passed = res
                res = ''
                var text;
                var start = '[';
                var end = '](/kfpa/' + passed + ')';
                var startPoint = cm.getCursor('start');
                var endPoint = cm.getCursor('end');

                text = cm.getSelection();
                cm.replaceSelection(start + text + end);
                startPoint.ch += start.length;
                endPoint.ch = end.ch + text.length;

                cm.setSelection(startPoint, endPoint);
                cm.focus();
                $('#searchResult').addClass('hidden'); //검색목록 삭제

                // action_url =  $('#app_context').val() + '/save_kb2',
                // $('#edit_form').attr("action",action_url)          
                // $('#edit_form').submit();

            }
        })
        clearInterval(playAlert);
    }, 1000)
}

//article변경시 백링크 검색
$(document).ready(function () {

    if (document.location.href.includes('kfpa') === true) {
        $.ajax({
            method: 'GET',
            url: $('#app_context').val() + '/backsearch_api'
        })
            .done((response) => {
                let link = document.location.href//.split('/');
                let pathname = new URL(link).pathname;
                let return_inner = ''

                for(let i = 0; i < response.length; i++){
                    //console.log(response[i].kb_body)

                    if (response[i].kb_body.includes(pathname) === true) {
                        return_inner = return_inner + '<li><a href="' + response[i]._id + '">' + response[i].kb_title + '</a></li>'
                    }
                }
                $("#back_element").append(return_inner)
            });
    }
})

