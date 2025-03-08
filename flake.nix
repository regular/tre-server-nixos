{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";
    secrets = {
      url = "github:regular/secrets";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    initial-states = {
      url = "github:regular/initial-states";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    tre-cli-tools-nixos = {
      url = "github:regular/tre-cli-tools-nixos";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, systems, secrets, initial-states, nixpkgs, ... }@inputs: let
    eachSystem = f: nixpkgs.lib.genAttrs (import systems) (system: f {
      inherit system;
      pkgs = nixpkgs.legacyPackages.${system};
    });
  in {
    nixosModules.default = {
      imports = [
        (import (./static.nix) self)
        (import (./options.nix) self)
        (import (./service.nix) self)
      ];
    };
    nixosConfigurations.demo = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        self.nixosModules.default
        secrets.nixosModules.default
        initial-states.nixosModules.default
        {
          services.tre-server.demo = {
            enable = true;
            tcp.port = 1;
            tcp.host = "local";
            http.port = 2;
            http.host = "none";
            allowedUsers = [ "demo-user" ];
            authorizedKeys."@/nvJmHAkcuDSMP0bEjnCyWKFKk7rcvApVGTp4WnjaOs=.ed25519" = [
              "manifest"
              "getConfig"
            ];
          };
          secrets.tre-server-demo = {
            source = {
              vault = "TestVault";
              item = "ssb/demo";
              fields = [ "secrets.json" ];
            };
          };
          initial-states.tre-server-demo = {
            source = {
              vault = "TestVault";
              item = "ssb/demo";
              field = "initial-state";
            };
          };
        }
      ];
    };
    packages = eachSystem ( { pkgs, system }: let 
      cli-tools = inputs.tre-cli-tools-nixos.packages.${system}.default;
      extraModulePath = "${cli-tools}/lib/node_modules/tre-cli-tools/node_modules";
    in {
      default = pkgs.buildNpmPackage rec {
        version = cli-tools.version;
        pname = "tre-server";

        dontNpmBuild = true;
        makeCacheWritable = true;
        npmFlags = [ "--omit=dev" "--omit=optional"];

        npmDepsHash = "sha256-IvYGwD/M41O5AL3pmoqz+za+Ctr8BeHZK5mcM6RHuNM=";

        src = ./src;

        postBuild = ''
          mkdir -p $out/lib/node_modules/${pname}
          cat <<EOF > $out/lib/node_modules/${pname}/extra-modules-path.js
          process.env.NODE_PATH += ':${extraModulePath}' 
          require('module').Module._initPaths()
          EOF
        '';

        meta = {
          description = "tre-cli-server from tre-cli-tools patched for use within systemd";
          license = pkgs.lib.licenses.mit;
          mainProgram = "tre-cli-server";
          maintainers = [ "jan@lagomorph.de" ];
        };
      };
      trectl = pkgs.buildNpmPackage rec {
        pname = "trectl";
        name = pname;

        src = ./trectl;

        npmDepsHash = "sha256-mloG+cmKVuBFYfaGLiIwD008AGlfalQUdbrP29Euwe4=";
        dontNpmBuild = true;

        nativeBuildInputs = [ pkgs.makeWrapper ];

        postBuild = ''
          mkdir -p $out/lib/node_modules/${pname}
          cat <<EOF > $out/lib/node_modules/${pname}/extra-modules-path.js
          process.env.NODE_PATH += ':${extraModulePath}' 
          require('module').Module._initPaths()
          EOF
        '';

        meta = {
          description = "diagnose tre-server issues (WIP)";
          license = pkgs.lib.licenses.mit;
          mainProgram = pname;
          maintainers = [ "jan@lagomorph.de" ];
        };
      };
      tre-creds = pkgs.buildNpmPackage rec {
        pname = "tre-creds";
        name = pname;

        src = ./tre-creds;

        npmDepsHash = "sha256-ddN3BxoZ+NaJydEDlf2k2pSw4towLBcixbWYyDud2d8=";
        dontNpmBuild = true;

        nativeBuildInputs = [ pkgs.makeWrapper ];

        postInstall = ''
          wrapProgram $out/bin/${pname} \
          --set SYSTEMD_CREDS ${pkgs.systemd}/bin/systemd-creds
          '';

        meta = {
          description = "Create keypair and encrypt it along with shs.caps using systemd-creds";
          license = pkgs.lib.licenses.mit;
          mainProgram = pname;
          maintainers = [ "jan@lagomorph.de" ];
        };
      };
    });

    devShells = eachSystem ( { pkgs, system, ... }: {
      default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs
          pkgs.python3
          pkgs.typescript
        ];
      };
    });
  };
}
