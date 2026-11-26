# Deploy automático a EC2 con SSM y GitHub OIDC

Cuenta AWS: sustituye `<AWS_ACCOUNT_ID>` en los ARN de ejemplo.  
Región: `us-east-2`  
Instancia: sustituye `<INSTANCE_ID>` en el ARN de ejemplo.  
Repositorio y rama: `AlanRamos2212/ProyectoDevOps`, `main`

## 1. Rol de la instancia

El rol `ProyectoDevOpsSSMInstanceRole` debe tener `AmazonSSMManagedInstanceCore` y esta política en línea para leer únicamente los parámetros del despliegue:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:GetParameter",
      "Resource": "arn:aws:ssm:us-east-2:<AWS_ACCOUNT_ID>:parameter/proyectodevops/prod/*"
    }
  ]
}
```

Se usa la clave administrada `aws/ssm` de Parameter Store; con esa clave administrada por AWS no hace falta agregar permisos KMS al rol.

## 2. Proveedor OIDC de GitHub

En IAM → Proveedores de identidad, crea el proveedor solo si aún no existe:

- Tipo: OpenID Connect
- URL del proveedor: `https://token.actions.githubusercontent.com`
- Audiencia: `sts.amazonaws.com`

## 3. Rol que usará GitHub Actions

Crea el rol `GitHubActionsProyectoDevOpsDeployRole` con proveedor OIDC de GitHub y audiencia `sts.amazonaws.com`. GitHub usa el formato anterior de `sub` para repositorios existentes y un formato con IDs para repositorios creados desde el 15 de julio de 2026. Esta condición acepta ambos formatos, siempre restringida a este repositorio y a `main`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<AWS_ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": [
            "repo:AlanRamos2212/ProyectoDevOps:ref:refs/heads/main",
            "repo:AlanRamos2212@*/ProyectoDevOps@*:ref:refs/heads/main"
          ]
        }
      }
    }
  ]
}
```

Adjunta al rol esta política en línea:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ssm:PutParameter",
      "Resource": "arn:aws:ssm:us-east-2:<AWS_ACCOUNT_ID>:parameter/proyectodevops/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ssm:us-east-2::document/AWS-RunShellScript",
        "arn:aws:ec2:us-east-2:<AWS_ACCOUNT_ID>:instance/<INSTANCE_ID>"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "ssm:GetCommandInvocation",
      "Resource": "*"
    }
  ]
}
```

## 4. Configuración de GitHub

En Settings → Secrets and variables → Actions, conserva estos secretos:

- `EC2_JWT_SECRET`
- `OPENOBSERVE_AUTHORIZATION`

Agrega estas variables del repositorio:

- `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::<AWS_ACCOUNT_ID>:role/GitHubActionsProyectoDevOpsDeployRole`
- `EC2_INSTANCE_ID` = ID de la instancia EC2.
- `DEPLOY_EC2_ENABLED` = `true`
- `OPENOBSERVE_ORG` = el ID configurado actualmente
- `OPENOBSERVE_URL` = `https://api.openobserve.ai` (opcional; es el valor predeterminado)

El workflow guarda las credenciales de aplicación como `SecureString`, manda el deploy por SSM y espera a que la aplicación responda en los puertos 8080 y 3000. No se requiere abrir SSH para GitHub Actions.
