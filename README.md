<br>

<p align="center">
<img src="./icon.png" style="width:100px;" />
</p>

<h1 align="center">vscode-tab-traversal</h1>

<p align="center">
Slightly intelligent text traversal with the Tab key.
</p>

<br>

> Use the `Tab` and `Shift+Tab` shortcuts (or custom keybindings) to
> traverse through text in a file.
>
> The cursor jumps to whichever of the following is closest:
>
> - the end of the line
> - the end of the nearest word
> - before a closing bracket / quote
>
> Empty lines are skipped.

&nbsp;

## Examples

This shows tabbing to the end of a word and before the closing quote of a string.

![Screen Recording 2022-10-04 at 12 33 33](https://user-images.githubusercontent.com/1925840/193878076-06bd385a-6fc3-4177-9795-05b93b850ff8.gif)

This shows tabbing out of `${}` within a template literal.

![Screen Recording 2022-10-04 at 12 34 22](https://user-images.githubusercontent.com/1925840/193878106-94ba518c-c309-41ec-9695-26e6fc8560b1.gif)

This shows tabbing out of a destructured object.

![Screen Recording 2022-10-04 at 12 35 00](https://user-images.githubusercontent.com/1925840/193878126-c8b40eb2-1705-45d2-a290-663cadbdbb89.gif)

This shows tabbing past the `=>` symbol of an arrow function.

![Screen Recording 2022-10-04 at 12 35 32](https://user-images.githubusercontent.com/1925840/193878178-526018a4-04cf-40af-8735-7d5add4f0529.gif)

## Prior art

https://github.com/donnellythomas/tab-traversal
