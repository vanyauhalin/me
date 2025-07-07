---
title: Abbreviations Have No Place in PascalCase
description: Abbreviations break PascalCase convention and reduce readability.
date: 2025-07-06T13:41:49Z
---

Let us settle the details in advance. By abbreviations, I mean replacing one or more words with a shortened form. For example, from identification to ID, from National Aeronautics and Space Administration to NASA. By PascalCase, I also mean camelCase.

Programming naming conventions do not always follow English rules, and PascalCase is a good example. PascalCase remove spaces by capitalizing the first letter of each word. Using abbreviations breaks this pattern, creates incompatibility with other naming conventions, and may result in less readable identifiers.

Examples of how abbreviations create incompatibility with other naming conventions. JavaScript's [`DOMStringMap`] converts snake-case `data-` attributes to camelCase `dataset` properties. Ruby on Rails uses [Zeitwerk] to map file paths like `jwt_helper.rb` to constant names like `JwtHelper`.

Examples of how abbreviations result in less readable identifiers. [`XMLHttpRequest`] from JavaScript DOM API. [`CGIXMLRPCRequestHandler`] from Python's `xmlrpc.server` module.

Update: The post should have been clearer. I am not arguing against abbreviations — I am arguing for treating them as regular words in PascalCase. For example: `XmlHttpRequest` instead of `XMLHttpRequest`, `CgiXmlRpcRequestHandler` instead of `CGIXMLRPCRequestHandler`.

<!-- Footnotes -->

[`DOMStringMap`]: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset/#name_conversion
[Zeitwerk]: https://github.com/fxn/zeitwerk/blob/v2.7.3/README.md#the-idea-file-paths-match-constant-paths
[`XMLHttpRequest`]: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/
[`CGIXMLRPCRequestHandler`]: https://github.com/python/cpython/blob/v3.13.5/Lib/xmlrpc/server.py#L636
