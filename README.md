# RelogioDeSol2

## Projeção para calcular $\beta$

Temos posição da pessoa $\boldsymbol{p} = (p_x, p_y, p_z)$, e posição da ponta da sombra $\boldsymbol{s} = (s_x, s_y, s_z)$.

Vetor da _olhada_ da pessoa à ponta da sombra $\boldsymbol{v} = (\boldsymbol{s} - \boldsymbol{p})$.<br>
(usando $\boldsymbol{v}$ de _view_)

Direção da olhada: $\hat{\boldsymbol{v}} = \frac{\boldsymbol{v}}{\|\boldsymbol{v}\|}$, com componentes $(\hat{v}_x, \hat{v}_y, \hat{v}_y)$.

Um vetor que começa no ponto $\boldsymbol{p}$ e segue em direção ao ponto $\boldsymbol{s}$, pode ser representado parametricamente:

$w(t) = \boldsymbol{p} + t \cdot \hat{\boldsymbol{v}}$, com os componentes:

$w_x(t)=p_x+t \cdot \hat{v}_x$<br>
$w_y(t)=p_y+t \cdot \hat{v}_y$<br>
$w_z(t)=p_z+t \cdot \hat{v}_z$

Todos os pontos no plano YZ tem $x=0$ então conseguimos calcular $t_0$ (o $t$ do momento de intersecção com esse plano) usando a equação de $w_x(t)$.

$0 = p_x+t_0 \cdot \hat{v}_x$<br>
$\Rightarrow t_0 = -\frac{p_x}{\hat{v}_x}$

Substituindo nas equações de $v(t)$:<br>

$w_x(t_0)=p_x - \frac{p_x}{\hat{v}_x} \cdot \hat{v}_x = 0$<br>
$w_y(t_0)=p_y - \frac{p_x}{\hat{v}_x} \cdot \hat{v}_y$<br>
$w_z(t_0)=p_z - \frac{p_x}{\hat{v}_x} \cdot \hat{v}_z$

O ponto de intersecção então é:

$\boldsymbol{w}(t_0) = (0, p_y - p_x \cdot \frac{\hat{v}_y}{\hat{v}_x}, p_z - p_x \cdot \frac{\hat{v}_z}{\hat{v}_x})$

O ângulo $\beta$ é então:<br>
$\beta = \tan^{-1}\left(\frac{w_z(t_0)}{w_y(t_0)}\right)$
