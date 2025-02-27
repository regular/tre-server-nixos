self: { config, lib, pkgs, ... }: 
with lib;
let 
  serverInstance = name: let 
    crg = config.services.tre-server.${name};
  in {
    #config = {}; # hmm ..
    options = {
      enable = mkEnableOption "ssb/tre pub server (sbot)";

      allowedUsers = mkOption {
        type = types.listOf types.str;
        default = [ "root" ];
        defaultText = literalExpression "[ \"root\" ]";
        description = "Members of the group that owns the controlling unix socket";
      };

      package = mkOption {
        type = types.package;
        default = self.packages.${pkgs.stdenv.system}.default;
        defaultText = literalExpression "pkgs.tre-cli-server";
        description = "package to use.";
      };

      tcp = {
        host = mkOption {
          type = types.str;
          default = "127.0.0.1";
          defaultText = "127.0.0.1";
          description = "TCP host/address to bind to";
        };

        port = mkOption {
          type = types.port;
          description = "TCP port to use";
        };
      };

      http = {
        host = mkOption {
          type = types.str;
          default = "127.0.0.1";
          defaultText = "127.0.0.1";
          description = "HTTP host/address to bind to (for websockets and HTTP API)";
        };

        port = mkOption {
          type = types.port;
          description = "TCP port to use for HTTI API/websockets";
        };
      };
    
      blobs = {
        sympathy = mkOption {
          type = types.int;
          default = 10;
          defaultText = "10";
          description = "";
        };

        max = mkOption {
          type = types.int;
          default = 3221225472;
          defaultText = "3221225472";
          description = "Maximum blob size in bytes";
        };
      };
    };

  };
in {
  options.services.tre-server = mkOption {
    type = types.attrsOf (types.submodule serverInstance);
    default = {};
    description = "Named instances of tre-server";
  };

   # Consume the submodule configurations
   config = let
     credsPath = name: "/etc/tre-creds/${name}";
     runtimePath = name: "tre-server/${name}";
     rpcSocketPath = name: "/var/run/${runtimePath name}"; # NOTE: no filename
     initSocketPath = name: "/var/run/${runtimePath name}/initial-state.socket";
     receive-initial-state = "${self.inputs.initial-states.packages.${pkgs.stdenv.system}.receive-initial-state}/bin/receive-initial-state";
     requiredFiles = [ "flume/log.offset" ];
   in lib.mkIf (length (attrNames config.services.tre-server) > 0) {

     environment.systemPackages = [
        self.packages.${pkgs.stdenv.system}.trectl
     ];

    secrets = mapAttrs' (name: cfg: {
      name = "tre-server-${name}";
      value = {
        path = credsPath name;
      };
    }) config.services.tre-server;

    initial-states = mapAttrs' (name: cfg: {
      name = "tre-server-${name}";
      value = {
        socketPath = initSocketPath name;
        inherit requiredFiles;
      };
    }) config.services.tre-server;

    users.groups = mapAttrs' (name: cfg: {
      name = "ssb-${name}";
      value.members = cfg.allowedUsers;
    }) config.services.tre-server;

    systemd.services = mapAttrs' (name: cfg:
      #lib.mkIf cfg.enable {
      let
        globalOpts = "--config %d/${name} --appname ${name} --path $STATE_DIRECTORY --socketPath ${rpcSocketPath name}";
        tcpOpts = "--host ${cfg.tcp.host} --port ${toString cfg.tcp.port}"; 
        wsOpts = "--ws.host ${cfg.http.host} --ws.port ${toString cfg.http.port}";
        blobsOpts = "--blobs.sympathy ${toString cfg.blobs.sympathy} --blobs.max ${toString cfg.blobs.max}";
        group = "ssb-${name}";
        
        requiresFiles = (builtins.length config.initial-states."tre-server-${name}".requiredFiles) != 0;
        receiveInitStateOpts = builtins.concatStringsSep " " (builtins.map (x: "--requiredFile '${x}'") requiredFiles);
        ExecReceiveInitState = if requiresFiles then "${receive-initial-state} server --socketPath ${initSocketPath name} --statePath $STATE_DIRECTORY ${receiveInitStateOpts} && " else "";
      in {
        name = "tre-server-${name}";
        value = {
          description = "tre server for ${name} network";
          after = [ "network-online.target" ];
          wants = [ "network-online.target" ];
          wantedBy = [ "multi-user.target" ];

          unitConfig = {
            AssertSecurity = "tpm2";
          };

          serviceConfig = {
            # NOTE: this causes switching of configs to hang until the state is received
            Type = "notify";
            NotifyAccess = "all"; # tre-server is a child of bash
            TimeoutStartSec="180min";
            ExecStart = "${pkgs.bash}/bin/bash -eu -c \"${ExecReceiveInitState} ${cfg.package}/bin/tre-server ${globalOpts} ${tcpOpts} ${wsOpts} ${blobsOpts}\"";
            WorkingDirectory = "/tmp";
            TemporaryFileSystem = "/tmp:size=40G";
            LoadCredentialEncrypted = "${name}:${credsPath name}";
            StandardOutput = "journal";
            StandardError = "journal";

            DynamicUser = true;
            SupplementaryGroups = [group]; 
            RuntimeDirectoryMode = "0750";
            ExecStartPost = [
              "${pkgs.coreutils}/bin/chmod 660 \${RUNTIME_DIRECTORY}/socket"
              "${pkgs.coreutils}/bin/chgrp -R ${group} \${RUNTIME_DIRECTORY}"
            ];

            RuntimeDirectory = runtimePath name;
            StateDirectory = "tre-server/${name}";
            Environment = [
              "DEBUG=multiserver*,tre-cli-server:*"
            ];
          };
        };
      })

      config.services.tre-server;
  };
}
