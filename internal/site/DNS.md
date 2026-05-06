# goalbuddy.dev DNS

GitHub Pages is configured for:

- Repository: `tolibear/goalbuddy`
- Pages build type: GitHub Actions workflow
- Custom domain: `goalbuddy.dev`
- Published artifact path: `internal/site`

Cloudflare is authoritative for `goalbuddy.dev`:

```text
serena.ns.cloudflare.com
will.ns.cloudflare.com
```

Required Cloudflare DNS records for the apex domain:

```text
Type  Name  Content
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
AAAA  @     2606:50c0:8000::153
AAAA  @     2606:50c0:8001::153
AAAA  @     2606:50c0:8002::153
AAAA  @     2606:50c0:8003::153
```

Recommended `www` redirect support:

```text
Type   Name  Content
CNAME  www   tolibear.github.io
```

After DNS resolves, re-check:

```bash
dig goalbuddy.dev +noall +answer -t A
dig goalbuddy.dev +noall +answer -t AAAA
dig www.goalbuddy.dev +nostats +nocomments +nocmd
curl -I https://goalbuddy.dev/
```

Then enforce HTTPS in GitHub Pages once the certificate is issued.
