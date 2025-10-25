{
  description = "Pidicon development environment (Devenv + Flakes)";

  inputs = {
    nixpkgs.url = "nixpkgs/nixpkgs-unstable";
    devenv.url = "github:cachix/devenv";
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
        project = self;  # Provides flake source tree for dir detection/assertions
        modules = [
          ./devenv.nix
        ];
      };
    in {
      devShells.${system}.default = project.shell;
      packages.${system}.default = project.shell;
    };
}
