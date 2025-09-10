self: { config, lib, pkgs, ... }: 
with lib;
let 
  serverInstance = name: let 
    crg = config.services.tre-server.${name};
  in {
    options = {
      enable = mkEnableOption "ssb/tre pub server (sbot)";

      autoname = mkOption {
        type = types.nullOr types.str;
        default = null;
        defaultText = "null";
        description = "If set, will auto-publish an about message with this name";
      };

      autorole = mkOption {
        type = types.nullOr types.str;
        default = null;
        defaultText = "null";
        description = "If set, will auto-publish an abot message with this role";
      };

      allowedUsers = mkOption {
        type = types.listOf types.str;
        default = [ "root" ];
        defaultText = literalExpression "[ \"root\" ]";
        description = "Members of the group that owns the controlling unix socket";
      };

      authorizedKeys = mkOption {
        type = types.attrsOf (types.listOf types.str);
        default = { };
        description = "Map of remote public keys to list of allowed muxrpc method paths (dot separated paths)";
        #check = value: builtins.all (k: builtins.match "^@.*.ed25519$" k != null)
        #  (builtins.attrNames value);
      };

      useGeneratedKeys = mkOption {
        type = types.bool;
        default = false;
        description = "Whether to use an automatically generated, device-specific ssb keypair. This also fully authorizes a session key, for browsers. (requires tre-generate-keypairs service)";
      };

      package = mkOption {
        type = types.package;
        default = self.packages.${pkgs.stdenv.system}.default;
        defaultText = literalExpression "pkgs.tre-cli-server";
        description = "package to use.";
      };

      tcp = {
        host = mkOption {
          type = types.nullOr types.str;
          default = "127.0.0.1";
          defaultText = "127.0.0.1";
          description = "TCP host/address to bind to. If null, will pick one automaticaly";
        };

        fqdn = mkOption {
          type = types.nullOr types.str;
          default = null;
          defaultText = "null";
          description = "Fully qualified domain name, if tcp server should be publicly visible, null (is default) otherwise";
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

}
