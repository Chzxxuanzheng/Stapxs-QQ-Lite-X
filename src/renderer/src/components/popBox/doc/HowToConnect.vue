<template>
	<div style="overflow-y: scroll" class="doc">
		<h3>{{ $t('前排警告') }}</h3>
		{{ $t('使用') }}<a>{{ $t('协议端') }}</a
		>{{
			$t(
				'可能会有一定的风险，此风险并不由 Stapxs QQ Lite X 所造成，而是使用',
			)
		}}<a>{{ $t('协议端') }}</a
		>{{ $t('本身的风险。请自行检查你使用的') }}<a>{{ $t('协议端') }}</a
		>{{ $t('的相关文档以了解关于风险的信息。') }}
		<hr />
		<h3>{{ $t('如何连接？') }}</h3>
		{{
			$t(
				'由于不同协议采用不同的连接方式和协议，将不再指定http/ws等协议进行连接。',
			)
		}}<br />
		{{ $t('在连接地址处输入你的') }}<a>{{ $t('协议端') }}</a
		>{{ $t('采用的')
		}}<a class="important">{{ $t('协议类型地址://ip地址:端口号') }}</a
		>{{ $t('，在密码处填入token（如有），然后点击连接按钮。') }}<br />
		{{ $t('如，你要连接运行在') }}<a class="important">localhost:3000</a
		>{{ $t('的lgr.ob，你可以输入')
		}}<a class="important">ob://localhost:3000</a><br />
		<br />
		<hr />
		<h3>{{ $t('使用 SSL 证书') }}</h3>
		{{ $t('在协议名称后面加s表示启用ssl证书。如：')
		}}<a class="important">obs://example.com</a
		>{{ $t('表示通过wss连接onebot v11协议端') }}<br />
		<b>{{ $t('注意：公网环境不安全，在公网使用一定要配合ssl证书') }}</b>
		<hr />
		<h4>{{ $t('附录: 当前支持的协议') }}</h4>
		{{ $t('详情可以看')
		}}<a
			class="link"
			href="https://github.com/Chzxxuanzheng/Stapxs-QQ-Lite-X/issues/1"
			target="_blank"
			>{{ $t('适配器情况详情') }}</a
		>
		<ul>
			<li>
				OneBot v11 (ob)<br />
				<span>{{ $t('非标准obv11额外适配') }}:</span>
				<ul>
					<li>nc</li>
					<li>lgr.ob</li>
				</ul>
			</li>
			<li>Milky (mk)</li>
		</ul>
		<hr />

		<h4>{{ $t('附录: 一些常协议端连接方式') }}</h4>
		<ul>
			<li>
				<header>nc</header>
				<div style="padding-left: 20px">
					<img src="/img/nc.png" alt="nc" /><br /><br />
					{{ $t('输入') }}<a class="important">ob://localhost:3001</a>
				</div>
			</li>
			<li>
				<header>lgr.ob</header>
				<div style="padding-left: 20px">
					<div
						style="
							background-color: var(--color-card-1);
							border-radius: 10px;
							padding: 10px;
							overflow-x: scroll;
						"
					>
						<span style="color: var(--color-green)">info</span>:
						Lagrange.OneBot.Core.Network.Service.ForwardWSService[10]<br />
						&ensp;&ensp;&ensp;&ensp;The server is started at
						http://*:3000/
					</div>
					<br />
					{{ $t('输入') }}<a class="important">ob://localhost:3000</a>
				</div>
			</li>
		</ul>
	</div>
</template>
