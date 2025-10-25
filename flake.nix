{
  description = "Pidicon development environment (Devenv + Flakes)";

  inputs = {
    nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    devenv.url  = "github:cachix/devenv";
    # pin to a safe commit
    # devenv.url = "github:cachix/devenv?ref=v1.9.3";
  };

  nixConfig.allow-dirty = true;

  outputs = { self, nixpkgs, devenv, ... }@inputs:
    let
      system = "x86_64-darwin";
      pkgs = import nixpkgs {
        inherit system;
        config = {
          allowUnfree = true;
          allowUnfreePredicate = pkg: let
            name = builtins.parseDrvName (builtins.getName pkg);
          in name.name == "cursor" || name.name == "code-cursor";
        };
      };

      project = devenv.lib.mkShell {
        inherit inputs pkgs;
        modules = [ ./devenv.nix ];
      };

      shellOut =
        if project ? shell then project.shell
        else if project ? devShell then project.devShell
        else if project ? shells && project.shells ? default then project.shells.default
        else devenv.mkShell { modules = [ ./devenv.nix ]; };
    in {
      devShells.${system}.default = shellOut;
      packages.${system}.default  = shellOut;
    };
}
