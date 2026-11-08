resource "aws_amplify_app" "ui" {
  name     = "library-of-leng"
  platform = "WEB"

  # No repository is configured: this app is deployed manually via the
  # AWS CLI (`aws amplify create-deployment` / `start-deployment`) instead
  # of git-connected CI/CD.

  # Rewrite only paths that don't look like a static asset (no file
  # extension) to index.html, so React Router's BrowserRouter can handle
  # client-side routes (e.g. /shops/:shopId). This is the standard Amplify
  # SPA rewrite pattern; it must exclude asset extensions, otherwise the
  # actual JS/CSS/image files get rewritten to the HTML shell too.
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|map|png|svg|txt|webp|woff|woff2|ttf|json)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.ui.id
  branch_name = "main"
  stage       = "PRODUCTION"

  enable_auto_build = false
}

output "amplify_app_id" {
  value = aws_amplify_app.ui.id
}

output "amplify_url" {
  value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.ui.default_domain}"
}
