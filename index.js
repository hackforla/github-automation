const fetch = require('node-fetch')

let OAUTHTOKEN = '' //need org admin token

function gitGet(route) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.github.com/${route}`, {
                headers: {
                    Authorization: `token ${OAUTHTOKEN}`
                },
                method: "GET"
            })
            .then(res => resolve(res))
            .catch(e => reject(e))
    })
}

function gitPostJson(route, jsonString) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.github.com/${route}`, {
                body: jsonString,
                headers: {
                    Authorization: `token ${OAUTHTOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method: "POST"
            })
            .then(res => resolve(res))
            .catch(e => reject(e))
    })

}

function gitPutJson(route, jsonString) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.github.com/${route}`, {
                body: jsonString,
                headers: {
                    Authorization: `token ${OAUTHTOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method: "PUT"
            })
            .then(res => resolve(res))
            .catch(e => reject(e))
    })

}

function gitPatchJson(route, jsonString) {
    return new Promise((resolve, reject) => {
        fetch(`https://api.github.com/${route}`, {
                body: jsonString,
                headers: {
                    Authorization: `token ${OAUTHTOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method: "PATCH"
            })
            .then(res => resolve(res))
            .catch(e => reject(e))
    })

}

checkGitUser('sjettingerjr@gmail.com') // test string
    .then(answer => {
        if (answer === 'Not Found') {
            // ask them to sign up for github in welcome email
        } else {
            gitGet(`orgs/hackforla/memberships/${answer}`)
                .then(r => r.json())
                .then(r => {
                    if (r.role) { //in org
                        console.log(r.role) //no action needed
                    } else { //not in org
                        gitPutJson(`/orgs/hackforla/memberships/${answer}`, { role: 'member' })
                            .then(r => r.json())
                            .then(r => console.log(r))
                    }
                })
                .catch(e => console.log(e))
        }
    })
    .catch(e => console.log(e))

function checkGitUser(email) {
    return new Promise((res, rej) => {
        fetch(`https://api.github.com/search/users?q=${email}+in%3Aemail`, {
                headers: {
                    Authorization: `token ${OAUTHTOKEN}`
                },
                method: "GET"
            })
            .then(ret => ret.json())
            .then(json => {
                if (json['total_count']) {
                    res(json.items[0].login)
                } else {
                    rej('Not Found')
                }
            }).catch(e => console.log(e))
    })
}
