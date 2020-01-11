const fs = require('fs')
const axios = require('axios')
const kue = require('kue')

const queue = kue.createQueue()

let crawlGit = async (url, localPath, gitPath = '/', done) => {
  if (gitPath == '/') {
    var response = await axios(`${url}/.git/HEAD`) // to prevent already declared below
    if (response.data.indexOf('ref: refs/heads/') < 0) return
  }

  var response = await axios(`${url}/${gitPath}`)

  switch (gitPath) {
    case '/': // if this is first request of git repo of the domain then create related folders
      try {
        fs.mkdirSync(localPath)
        fs.mkdirSync(`${localPath}/.git`)
        fs.mkdirSync(`${localPath}/.git/hooks`)
        fs.mkdirSync(`${localPath}/.git/info`)
        fs.mkdirSync(`${localPath}/.git/logs`)
        fs.mkdirSync(`${localPath}/.git/objects`)
        fs.mkdirSync(`${localPath}/.git/refs`)

        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/index' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/HEAD' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/COMMIT_EDITMSG' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/FETCH_HEAD' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/ORIG_HEAD' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/config' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/description' }).removeOnComplete(true).save()
        
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/logs/HEAD' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/logs/refs/heads/master' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/logs/refs/remotes/origin/HEAD' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/logs/refs/remotes/origin/master' }).removeOnComplete(true).save()
        
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/applypatch-msg.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/commit-msg.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/fsmonitor-watchman.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/post-update.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/pre-applypatch.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/pre-commit.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/pre-push.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/pre-rebase.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/prepare-commit-msg.sample' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/hooks/update.sample' }).removeOnComplete(true).save()
        
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/info/exclude' }).removeOnComplete(true).save()
        queue.createJob('crawlGit', { url, localPath, gitPath: '/.git/packed-refs' }).removeOnComplete(true).save()
        done()
      } catch (err) { }
      break
    
    case '/.git/HEAD':
      queue.createJob('crawlGit', { url, localPath, gitPath: `/.git/${response.data.split('ref: ')[1]}`.trim() }).removeOnComplete(true).save()
      done()
      break

    case '/.git/logs/HEAD':
      let lines = response.data.split('\n')
      for (line of lines) {
        if (line) {
          commitObject = line.split(' ')[1]
          // if (!fs.existsSync(`${localPath}/.git/objects/${commitObject.substr(0, 2)}`)) {
          //   fs.mkdirSync(`${localPath}/.git/logs/${commitObject.substr(0, 2)}`)
          // }
          queue.createJob('crawlGit', { 
            url: url, 
            localPath: localPath, 
            gitPath: `/.git/objects/${commitObject.substr(0, 2)}/${commitObject.substr(2)}`
          }).removeOnComplete(true).save()
        }
      }
      done()
      break

    default:
      console.log(`${url}/${gitPath} is downloading..`)
      let paths = gitPath.split('/')
      while (paths[0] !== '.git') {
        paths.shift()
      }
      console.log(paths)
      let fileName = paths.pop()
      let local = localPath
      while (paths.length !== 0) {
        local += '/' + paths.shift()
        if (!fs.existsSync(local)) {
          fs.mkdirSync(local)
        }
      }

      fs.writeFileSync(`${local}/${fileName}`, response.data)
      console.log(`${url}/${gitPath} is download finished!`)
      done()
      break
  }
}

queue.process('crawlGit', 5, (job, done) => {
  crawlGit(job.data.url, job.data.localPath, job.data.gitPath, done)
})


crawlGit('https://amazvol.com/', 'amazvol')