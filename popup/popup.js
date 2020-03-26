// URLからドメインを抽出
function url2domain(url) {
  let domain = url.match(/^https?:\/{2,}(.*?)(?:\/|\?|#|$)/)
  if (domain == null) return
  return domain[1]
}

// 日付データのフォーマット
function format_date(date, format) {
  format = format.replace(/yyyy/g, date.getFullYear())
  format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2))
  format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2))
  format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2))
  format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2))
  format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2))
  format = format.replace(/SSS/g, ('00' + date.getMilliseconds()).slice(-3))
  return format
}

// 削除ボタン
function onDeleteButtonClick(e) {
  let button = e.currentTarget
  let url = button.value
  let details = {
    url: url
  }
  chrome.history.deleteUrl(details)
  let tr = button.parentNode.parentNode
  let table = tr.parentNode
  table.deleteRow(tr.rowIndex)
}

// 履歴から表の列を生成
function get_row(history) {
  let tr = document.createElement('tr')

  // 日付を追加
  let td_date = document.createElement('td')
  td_date.style.fontSize = 10
  td_date.style.width = 50
  td_date.value = history.lastVisitTime
  let date = new Date(history.lastVisitTime)
  td_date.innerText = format_date(date, 'MM/dd HH:mm')
  tr.appendChild(td_date)

  // アイコンを追加
  let td_icon = document.createElement('td')
  let favicon = document.createElement('img')
  let domain = url2domain(history.url)
  favicon.src = 'http://www.google.com/s2/favicons?domain=' + domain
  td_icon.appendChild(favicon)
  tr.appendChild(td_icon)

  // タイトルを追加
  let td_title = document.createElement('td')
  let link = document.createElement('a')
  link.classList.add('waves-effect', 'waves-teal', 'btn-flat')
  link.href = history.url
  link.target = '_blank'
  if (history.title === '') {
    link.innerText = history.url
    let max_length = 22
    if (link.innerText.length > max_length) {
      link.innerText = link.innerText.substr(0, max_length) + '...'
    }
  }
  else link.innerText = history.title

  td_title.appendChild(link)
  tr.appendChild(td_title)

  // 削除ボタンを追加
  let td_del = document.createElement('td')
  let button_del = document.createElement('button')
  button_del.classList.add('btn-small', 'waves-effect',
    'waves-teal', 'btn-flat', 'transparent')
  let icon = document.createElement('i')
  icon.classList.add('material-icons')
  icon.innerText = 'close'
  button_del.appendChild(icon)
  button_del.value = history.url
  button_del.addEventListener('click', onDeleteButtonClick)
  td_del.appendChild(button_del)
  tr.appendChild(td_del)

  return tr
}

// 検索
function onSubmit(e) {
  let form = e.currentTarget
  let text = form.elements[0].value
  let card = form.parentNode
  let history_table = card.childNodes[1].childNodes[0]
  while (history_table.rows.length > 0) history_table.deleteRow(0)
  let now = Date.now()
  let startTime = now - 1000 * 60 * 60 * 24 * 7 * 365
  let query = {
    text: text,
    startTime: startTime,
    maxResults: 100
  }
  chrome.history.search(query, function (results) {
    console.log(results)
    results.forEach(function (result) {
      history_table.appendChild(get_row(result))
    })
  })

  // ページ更新拒否
  return e.preventDefault()
}

// 無限スクロール
function onScroll(e) {
  let div_history_table = e.currentTarget
  let scrollTop = div_history_table.scrollTop
  let scrollHeight = div_history_table.scrollHeight
  if ((scrollHeight - scrollTop) > 1000) return

  let history_table = div_history_table.childNodes[0]
  let card = div_history_table.parentNode
  let form = card.childNodes[0]
  let text = form.elements[0].value
  let rows = history_table.rows
  let end_tr = rows[rows.length - 1]
  let endTime = end_tr.childNodes[0].value
  let query = {
    text: text,
    startTime: endTime - 1000 * 60 * 60 * 24 * 7 * 365,
    endTime: endTime,
    maxResults: 20
  }
  chrome.history.search(query, function (results) {
    results.forEach(function (result) {
      if (result.url === location.href) return
      history_table.appendChild(get_row(result))
    })
  })
}

// ドメインごとの履歴リストを作成
function set_history_table(table, query) {
  let td = document.createElement('td')
  let card = document.createElement('div')
  card.classList.add('card')

  // 検索欄
  let form = document.createElement('form')
  form.addEventListener('submit', onSubmit)

  let search = document.createElement('dev')
  search.classList.add('input-field', 'row')

  // let icon = document.createElement('i')
  // icon.classList.add('material-icons', 'prefix')
  // icon.innerText = 'search'
  // search.appendChild(icon)

  let input = document.createElement('input')
  input.type = 'text'
  input.id = 'icon_prefix'
  input.classList.add('validate')
  input.value = query.text
  search.appendChild(input)

  form.appendChild(search)
  card.appendChild(form)

  // 履歴リスト追加
  let div_history_table = document.createElement('div')
  div_history_table.addEventListener('scroll', onScroll)
  div_history_table.style.width = window.parent.screen.width / 4 - 13
  let height = window.innerHeight - 150
  let height_min = 400
  div_history_table.style.height = (height < height_min ? height_min : height)
  div_history_table.style.overflow = 'auto'

  let history_table = document.createElement('table')
  chrome.history.search(query, function (results) {
    results.forEach(function (result) {
      if (result.url === location.href) return
      history_table.appendChild(get_row(result))
    })
  })
  div_history_table.appendChild(history_table)

  card.appendChild(div_history_table)

  td.appendChild(card)
  table.appendChild(td)
}

// ドメインリスト作成
function get_domains(historys) {
  let domain_list = historys.map(x => x.domain)
  let domain_num = []
  domain_list.forEach(function (domain, i, self) {
    if (self.indexOf(domain) === i) {
      domain_num.push({ domain: domain, num: 1 })
    } else {
      let domains = domain_num.map(x => x.domain)
      let idx = domains.indexOf(domain)
      domain_num[idx]['num']++
    }
  })
  domain_num.sort(function (a, b) {
    return b.num - a.num
  })
  domain_num = domain_num.filter(x => x.num > 10)
  let domains = domain_num.map(x => x.domain)
  domains.unshift('')
  while (domains.length < 4) domains.unshift('')

  return domains.slice(0, 8)
}

// メイン関数
document.addEventListener('DOMContentLoaded', function () {
  let table = document.createElement('table')

  let now = Date.now()
  let startTime = now - 1000 * 60 * 60 * 24 * 7 * 365
  let query = {
    text: '',
    startTime: startTime,
    maxResults: 500
  }
  chrome.history.search(query, function (results) {
    results.forEach(function (result) {
      result.domain = url2domain(result.url)
    })
    console.log(results)
    let domains = get_domains(results)
    for (let query_text of domains) {
      let query = {
        text: query_text,
        startTime: startTime,
        maxResults: 20
      }
      set_history_table(table, query)
    }
  })

  document.getElementById('wrapper').appendChild(table)
})
